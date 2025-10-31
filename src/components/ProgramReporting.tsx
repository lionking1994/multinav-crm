import React, { useState } from 'react';
import type { Client, HealthActivity, WorkforceData } from '../types';
import Card from './Card';
import { Zap, Calendar, FileDown, AlertTriangle, Bot, Lightbulb } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { generateReportInsights } from '../services/geminiService';

interface AiInsight {
  title: string;
  insight: string;
  recommendation?: string;
}

interface ReportData {
  dateRange: { start: string; end: string };
  clientSummary: {
    total: number;
    ethnicities: { name: string; value: number }[];
    referralSources: { name: string; value: number }[];
    regions: { name: string; value: number }[];
  };
  activitySummary: {
    total: number;
    totalItems: number;
    totalNavigationItems: number;
    totalServiceItems: number;
    totalDischarges: number;
    navigationAssistance: { name: string; value: number }[];
    servicesAccessed: { name: string; value: number }[];
  };
  workforceSummary: {
    totalFTE: number;
    northFTE: number;
    southFTE: number;
    languages: string[];
  };
  aiInsights: AiInsight[];
}

const ProgramReporting: React.FC<{
  clients: Client[];
  activities: HealthActivity[];
  workforce: WorkforceData;
}> = ({ clients, activities, workforce }) => {
  const today = new Date().toISOString().split('T')[0];
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(threeMonthsAgoStr);
  const [endDate, setEndDate] = useState(today);
  const [selectedRegion, setSelectedRegion] = useState<'all' | 'Perth North' | 'Perth South'>('all');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setError(null);
    setReportData(null);

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the whole end day

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        setError("Invalid date range. Please ensure the start date is before the end date.");
        setIsLoading(false);
        return;
    }

    const filteredClients = clients.filter(c => {
        const refDate = new Date(c.referralDate);
        const regionMatch = selectedRegion === 'all' || c.region === selectedRegion;
        return refDate >= start && refDate <= end && regionMatch;
    });

    const filteredActivities = activities.filter(a => {
        const actDate = new Date(a.date);
        const dateInRange = actDate >= start && actDate <= end;
        const client = clients.find(c => c.id === a.clientId);
        const regionMatch = selectedRegion === 'all' || (client && client.region === selectedRegion);
        return dateInRange && regionMatch;
    });

    if (filteredClients.length === 0 && filteredActivities.length === 0) {
        setError("No client or activity data found for the selected period.");
        setIsLoading(false);
        return;
    }

    // --- Aggregations ---
    const clientSummary = {
        total: filteredClients.length,
        ethnicities: Object.entries(filteredClients.reduce((acc: Record<string, number>, c) => {
            const key = c.ethnicity || 'Unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {})).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value),
        referralSources: Object.entries(filteredClients.reduce((acc: Record<string, number>, c) => {
            const key = c.referralSource || 'Unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {})).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value),
        regions: Object.entries(filteredClients.reduce((acc: Record<string, number>, c) => {
            const key = c.region || 'Unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {})).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value),
    };

    // Calculate individual activity items
    const totalNavigationItems = filteredActivities.reduce((sum, a) => {
        let count = a.navigationAssistance.length;
        if (a.navigationAssistance.includes('Other Navigation Assistance')) {
            // Already counted in the array, just note it has other text
        }
        return sum + count;
    }, 0);
    
    const totalServiceItems = filteredActivities.reduce((sum, a) => {
        let count = a.servicesAccessed.length;
        if (a.servicesAccessed.includes('Other Services')) {
            // Already counted in the array, just note it has other text
        }
        return sum + count;
    }, 0);
    
    const totalDischarges = filteredActivities.filter(a => a.isDischarge).length;
    const totalActivityItems = totalNavigationItems + totalServiceItems + totalDischarges;

    const activitySummary = {
        total: filteredActivities.length,
        totalItems: totalActivityItems,
        totalNavigationItems,
        totalServiceItems,
        totalDischarges,
        navigationAssistance: Object.entries(filteredActivities.flatMap(a => a.navigationAssistance).reduce((acc: Record<string, number>, service) => {
            acc[service] = (acc[service] || 0) + 1;
            return acc;
        }, {})).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value),
        servicesAccessed: Object.entries(filteredActivities.flatMap(a => a.servicesAccessed).reduce((acc: Record<string, number>, service) => {
            acc[service] = (acc[service] || 0) + 1;
            return acc;
        }, {})).map(([name, value]) => ({name, value})).sort((a,b) => b.value - a.value),
    };

    const northFTE = workforce.north.reduce((sum, s) => sum + s.fte, 0);
    const southFTE = workforce.south.reduce((sum, s) => sum + s.fte, 0);
    const workforceSummary = {
        northFTE,
        southFTE,
        totalFTE: northFTE + southFTE,
        languages: [...new Set(workforce.north.flatMap(s => s.languages).concat(workforce.south.flatMap(s => s.languages)))],
    };

    try {
        const aiInsights = await generateReportInsights(clientSummary, activitySummary, workforceSummary, { start: startDate, end: endDate });
        setReportData({
            dateRange: { start: startDate, end: endDate },
            clientSummary,
            activitySummary,
            workforceSummary,
            aiInsights
        });
    } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate AI insights.');
    } finally {
        setIsLoading(false);
    }
  };
  
  const createPdf = () => {
    if (!reportData) return;
    const doc = new jsPDF();
    let y = 20;

    const addSection = (title: string, callback: () => void) => {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, y);
        y += 8;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        callback();
        y += 10;
    };
    
    doc.setFontSize(22);
    doc.text('Program Report', 105, y, { align: 'center' });
    y += 8;
    doc.setFontSize(12);
    doc.text(`Reporting Period: ${new Date(reportData.dateRange.start).toLocaleDateString()} - ${new Date(reportData.dateRange.end).toLocaleDateString()}`, 105, y, { align: 'center' });
    y += 8;
    doc.text(`Region: ${selectedRegion}`, 105, y, { align: 'center' });
    y += 15;

    addSection('AI-Generated Summary & Recommendations', () => {
        reportData.aiInsights.forEach(insight => {
            if (y > 260) { doc.addPage(); y = 20; }
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(insight.title, 14, y);
            y += 6;
            doc.setFont('helvetica', 'normal');
            const insightLines = doc.splitTextToSize(insight.insight, 180);
            doc.text(insightLines, 14, y);
            y += insightLines.length * 5 + 2;
            if (insight.recommendation) {
                doc.setFont('helvetica', 'italic');
                const recLines = doc.splitTextToSize(`Recommendation: ${insight.recommendation}`, 180);
                doc.text(recLines, 14, y);
                y += recLines.length * 5 + 4;
            }
        });
    });

    addSection('Client Demographics', () => {
        (doc as any).autoTable({
            startY: y, theme: 'striped',
            head: [['Metric', 'Value']],
            body: [
                ['New Clients Registered', reportData.clientSummary.total],
                ['Region Filter', selectedRegion]
            ],
        });
        y = (doc as any).lastAutoTable.finalY + 5;
        
        // Region breakdown
        if (reportData.clientSummary.regions && reportData.clientSummary.regions.length > 0) {
            (doc as any).autoTable({
                startY: y, theme: 'striped',
                head: [['Region', 'Count']],
                body: reportData.clientSummary.regions.map(r => [r.name, r.value]),
            });
            y = (doc as any).lastAutoTable.finalY + 5;
        }
        
        (doc as any).autoTable({
            startY: y, theme: 'striped',
            head: [['Client Ethnicity', 'Count']],
            body: reportData.clientSummary.ethnicities.map(e => [e.name, e.value]),
        });
        y = (doc as any).lastAutoTable.finalY + 5;
         (doc as any).autoTable({
            startY: y, theme: 'striped',
            head: [['Referral Source', 'Count']],
            body: reportData.clientSummary.referralSources.map(r => [r.name, r.value]),
        });
         y = (doc as any).lastAutoTable.finalY;
    });
    
    addSection('Health Navigation Activities', () => {
        (doc as any).autoTable({
            startY: y, theme: 'striped',
            head: [['Metric', 'Value']],
            body: [
                ['Activity Records', reportData.activitySummary.total],
                ['Total Activities', reportData.activitySummary.totalItems],
                ['Navigation', reportData.activitySummary.totalNavigationItems],
                ['Services', reportData.activitySummary.totalServiceItems],
                ['Discharges', reportData.activitySummary.totalDischarges]
            ],
        });
        y = (doc as any).lastAutoTable.finalY + 5;
        (doc as any).autoTable({
            startY: y, theme: 'striped',
            head: [['Top Navigation Assistance', 'Count']],
            body: reportData.activitySummary.navigationAssistance.map(n => [n.name, n.value]),
        });
        y = (doc as any).lastAutoTable.finalY + 5;
        (doc as any).autoTable({
            startY: y, theme: 'striped',
            head: [['Top Services Accessed', 'Count']],
            body: reportData.activitySummary.servicesAccessed.map(s => [s.name, s.value]),
        });
        y = (doc as any).lastAutoTable.finalY;
    });

    doc.save(`Program_Report_${startDate}_to_${endDate}.pdf`);
  };

  const createWordDoc = () => {
      if (!reportData) return;

      const styles = `<style>
          body { font-family: Arial, sans-serif; font-size: 11pt; }
          h1 { font-size: 22pt; text-align: center; } h2 { font-size: 16pt; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin-top: 20px; }
          h3 { font-size: 12pt; font-weight: bold; } p { margin-bottom: 10px; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; }
          th, td { border: 1px solid #dddddd; text-align: left; padding: 8px; }
          th { background-color: #f2f2f2; }
      </style>`;

      let content = `<h1>Program Report</h1><p style="text-align:center;">Reporting Period: ${reportData.dateRange.start} to ${reportData.dateRange.end}</p>`;
      content += `<p style="text-align:center;">Region: ${selectedRegion}</p>`;
      
      content += `<h2>AI-Generated Summary & Recommendations</h2>`;
      reportData.aiInsights.forEach(i => {
          content += `<h3>${i.title}</h3><p>${i.insight}</p>`;
          if(i.recommendation) content += `<p><em><b>Recommendation:</b> ${i.recommendation}</em></p>`;
      });

      const createTable = (headers: string[], data: (string|number)[][]) => {
          let table = `<table><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
          data.forEach(row => { table += `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`; });
          return table + '</table>';
      }

      content += `<h2>Client Demographics</h2>` + 
        createTable(['Metric', 'Value'], [['New Clients Registered', reportData.clientSummary.total]]) + 
        createTable(['Client Ethnicity', 'Count'], reportData.clientSummary.ethnicities.map(e => [e.name, e.value])) + 
        createTable(['Referral Source', 'Count'], reportData.clientSummary.referralSources.map(r => [r.name, r.value]));
      
      content += `<h2>Health Navigation Activities</h2>` + 
        createTable(['Metric', 'Value'], [
            ['Activity Records', reportData.activitySummary.total],
            ['Total Activities', reportData.activitySummary.totalItems],
            ['Navigation', reportData.activitySummary.totalNavigationItems],
            ['Services', reportData.activitySummary.totalServiceItems],
            ['Discharges', reportData.activitySummary.totalDischarges]
        ]) + 
        createTable(['Top Navigation Assistance', 'Count'], reportData.activitySummary.navigationAssistance.map(n => [n.name, n.value])) + 
        createTable(['Top Services Accessed', 'Count'], reportData.activitySummary.servicesAccessed.map(s => [s.name, s.value]));

      const source = `data:application/vnd.ms-word;charset=utf-8,${encodeURIComponent(`<html><head>${styles}</head><body>${content}</body></html>`)}`;
      const link = document.createElement("a");
      link.href = source;
      link.download = `Program_Report_${startDate}_to_${endDate}.doc`;
      link.click();
  };


  return (
    <Card>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Program Reporting</h2>
        <div className="flex items-center gap-2 flex-wrap">
            <button onClick={createPdf} disabled={!reportData || isLoading} className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
                <FileDown className="mr-2 h-4 w-4" /> PDF
            </button>
             <button onClick={createWordDoc} disabled={!reportData || isLoading} className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
                <FileDown className="mr-2 h-4 w-4" /> Word
            </button>
        </div>
      </div>

      <div className="p-4 bg-baby-blue-50/50 dark:bg-gray-800/60 rounded-lg border border-baby-blue-200 dark:border-gray-700 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
                <label htmlFor="region" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Region</label>
                <select 
                    id="region" 
                    value={selectedRegion} 
                    onChange={e => setSelectedRegion(e.target.value as 'all' | 'Perth North' | 'Perth South')} 
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                    <option value="all">All Regions</option>
                    <option value="Perth North">Perth North</option>
                    <option value="Perth South">Perth South</option>
                </select>
            </div>
            <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
            </div>
            <button onClick={handleGenerateReport} disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-lime-green-500 hover:bg-lime-green-600 focus:outline-none disabled:bg-gray-400">
                {isLoading ? (
                    <> <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Generating...</>
                ) : (
                    <><Zap className="mr-2 h-5 w-5" /> Generate Report</>
                )}
            </button>
        </div>
      </div>
      
       <div className="mt-4 min-h-[200px]">
        {error && (
            <div className="flex items-center p-4 bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 rounded-md">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
        )}

        {!isLoading && !error && !reportData && (
            <div className="text-center py-10 px-6 bg-baby-blue-100/50 dark:bg-gray-800/50 rounded-lg">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">Ready to Generate Report</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select a date range and click "Generate Report".</p>
            </div>
        )}

        {reportData && (
            <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Report Preview for {new Date(reportData.dateRange.start).toLocaleDateString()} to {new Date(reportData.dateRange.end).toLocaleDateString()}</h3>
                
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h4 className="font-semibold text-md text-lime-green-600 dark:text-lime-green-400 mb-2 flex items-center"><Bot className="mr-2 h-5 w-5"/> AI-Generated Summary</h4>
                    {reportData.aiInsights.map((insight, index) => (
                         <div key={index} className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 first:mt-0 first:pt-0 first:border-none">
                            <p className="font-semibold text-gray-700 dark:text-gray-200">{insight.title}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{insight.insight}</p>
                            {insight.recommendation && (
                                <div className="mt-2 flex items-start space-x-2 text-sm text-gray-500 dark:text-gray-400">
                                    <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                    <p><b>Recommendation:</b> {insight.recommendation}</p>
                                </div>
                            )}
                         </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <h4 className="font-semibold text-md text-lime-green-600 dark:text-lime-green-400 mb-2">Key Metrics</h4>
                        <ul className="space-y-2 text-sm">
                            <li className="flex justify-between"><span>New Clients:</span> <span className="font-bold">{reportData.clientSummary.total}</span></li>
                            <li className="flex justify-between"><span>Activity Records:</span> <span className="font-bold">{reportData.activitySummary.total}</span></li>
                            <li className="flex justify-between"><span>Total Activities:</span> <span className="font-bold">{reportData.activitySummary.totalItems}</span></li>
                            <li className="flex justify-between text-xs text-gray-500">
                                <span className="ml-4">• Navigation: {reportData.activitySummary.totalNavigationItems}</span>
                            </li>
                            <li className="flex justify-between text-xs text-gray-500">
                                <span className="ml-4">• Services: {reportData.activitySummary.totalServiceItems}</span>
                            </li>
                            <li className="flex justify-between text-xs text-gray-500">
                                <span className="ml-4">• Discharges: {reportData.activitySummary.totalDischarges}</span>
                            </li>
                        </ul>
                     </div>
                     
                     <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <h4 className="font-semibold text-md text-lime-green-600 dark:text-lime-green-400 mb-2">Region Distribution</h4>
                        <ul className="space-y-1 text-sm">
                            {reportData.clientSummary.regions && reportData.clientSummary.regions.length > 0 ? (
                                reportData.clientSummary.regions.map(r => (
                                    <li key={r.name} className="flex justify-between">
                                        <span>{r.name}</span>
                                        <span className="font-bold">{r.value}</span>
                                    </li>
                                ))
                            ) : (
                                <li className="text-gray-500">No regional data available</li>
                            )}
                        </ul>
                     </div>
                     
                     <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <h4 className="font-semibold text-md text-lime-green-600 dark:text-lime-green-400 mb-2">Top Client Ethnicity</h4>
                        <ul className="space-y-1 text-sm">
                            {reportData.clientSummary.ethnicities.slice(0,3).map(e => <li key={e.name} className="flex justify-between"><span>{e.name}</span> <span className="font-bold">{e.value}</span></li>)}
                        </ul>
                     </div>
                     
                     <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <h4 className="font-semibold text-md text-lime-green-600 dark:text-lime-green-400 mb-2">Top Referral Sources</h4>
                        <ul className="space-y-1 text-sm">
                            {reportData.clientSummary.referralSources.slice(0,3).map(r => <li key={r.name} className="flex justify-between"><span>{r.name}</span> <span className="font-bold">{r.value}</span></li>)}
                        </ul>
                     </div>
                </div>
            </div>
        )}
      </div>

    </Card>
  );
};

export default ProgramReporting;