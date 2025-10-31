import React, { useState, useCallback } from 'react';
import type { Client, HealthActivity, WorkforceData, AiInsight } from '../types';
import { generateInsights } from '../services/geminiService';
import Card from './Card';
import { BotMessageSquare, Zap, AlertTriangle, Lightbulb, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';

interface AiInsightsDashboardProps {
  clientsData: Client[];
  activityData: HealthActivity[];
  workforceData: WorkforceData;
}

const AiInsightsDashboard: React.FC<AiInsightsDashboardProps> = ({ clientsData, activityData, workforceData }) => {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setInsights([]);

    if (clientsData.length === 0 && activityData.length === 0) {
        setError("There is no client or activity data to analyze. Please add some entries first.");
        setIsLoading(false);
        return;
    }

    try {
      const result = await generateInsights(clientsData, activityData, workforceData);
      setInsights(result);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [clientsData, activityData, workforceData]);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = margin;

    const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
        }
    };

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#0ea5e9'); // baby-blue-500
    doc.text('AI-Powered Insights', pageWidth / 2, y, { align: 'center' });
    y += 20;

    insights.forEach((insight, index) => {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#65a30d'); // lime-green-600
        const titleLines = doc.splitTextToSize(insight.title, pageWidth - margin * 2);
        checkPageBreak(titleLines.length * 7 + 10);
        doc.text(titleLines, margin, y);
        y += titleLines.length * 7;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40);
        const insightLines = doc.splitTextToSize(insight.insight, pageWidth - margin * 2);
        checkPageBreak(insightLines.length * 5 + 5);
        y += 5;
        doc.text(insightLines, margin, y);
        y += insightLines.length * 5;

        if (insight.recommendation) {
            y += 5;
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100);
            const recommendationText = `Recommendation: ${insight.recommendation}`;
            const recommendationLines = doc.splitTextToSize(recommendationText, pageWidth - margin * 2);
            checkPageBreak(recommendationLines.length * 5 + 5);
            doc.text(recommendationLines, margin, y);
            y += recommendationLines.length * 5;
        }
        
        if (index < insights.length - 1) {
            y += 10;
            checkPageBreak(12);
            doc.setDrawColor(200);
            doc.line(margin, y, pageWidth - margin, y);
            y += 10;
        }
    });

    doc.save('ai-insights.pdf');
  };

  const handleDownloadWord = () => {
    const styles = `
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12pt; }
        h1 { color: #0ea5e9; font-size: 20pt; }
        h2 { color: #65a30d; font-size: 16pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 24px; }
        p { line-height: 1.5; margin-bottom: 12px; }
        em strong { font-style: normal; font-weight: bold; }
    </style>`;

    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>AI-Powered Insights</title>${styles}</head><body>`;
    
    let content = `<h1>MultiNav iCRM - AI-Powered Insights</h1>`;
    insights.forEach(insight => {
        content += `<h2>${insight.title}</h2>`;
        content += `<p>${insight.insight}</p>`;
        if (insight.recommendation) {
            content += `<p><em><strong>Recommendation:</strong> ${insight.recommendation}</em></p>`;
        }
    });

    const footer = "</body></html>";
    const source = header + content + footer;

    const fileDownloadUrl = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(source);
    const downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    downloadLink.href = fileDownloadUrl;
    downloadLink.download = 'ai-insights.doc';
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };


  return (
    <Card>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">AI-Powered Insights</h3>
        <div className="flex items-center gap-2 flex-wrap justify-start md:justify-end">
            <button
                onClick={handleDownloadPDF}
                disabled={insights.length === 0 || isLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                title="Download as PDF"
            >
                <FileDown className="mr-2 h-4 w-4" /> PDF
            </button>
            <button
                onClick={handleDownloadWord}
                disabled={insights.length === 0 || isLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none disabled:bg-gray-200 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                title="Download as Word"
            >
                <FileDown className="mr-2 h-4 w-4" /> Word
            </button>
            <button
            onClick={handleGenerateInsights}
            disabled={isLoading}
            className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-lime-green-500 hover:bg-lime-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
            {isLoading ? (
                <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
                </>
            ) : (
                <>
                <Zap className="mr-2 h-5 w-5" />
                Analyze Full Dataset
                </>
            )}
            </button>
        </div>
      </div>
      
      <div className="mt-4 min-h-[200px]">
        {error && (
            <div className="flex items-center p-4 bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 rounded-md">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
                <div>
                    <p className="font-semibold text-red-800 dark:text-red-200">Error Generating Insights</p>
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
            </div>
        )}

        {!isLoading && !error && insights.length === 0 && (
            <div className="text-center py-10 px-6 bg-baby-blue-100/50 dark:bg-gray-800/50 rounded-lg">
                <BotMessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">Ready for Analysis</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Click the button to analyze the entire dataset.</p>
            </div>
        )}
        
        {insights.length > 0 && (
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div key={index} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                 <h4 className="font-semibold text-md text-lime-green-600 dark:text-lime-green-400 mb-2">{insight.title}</h4>
                 <p className="text-gray-600 dark:text-gray-300">{insight.insight}</p>
                 {insight.recommendation && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex items-start space-x-2">
                        <Lightbulb className="h-5 w-5 text-baby-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Recommendation:</span> {insight.recommendation}</p>
                    </div>
                 )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default AiInsightsDashboard;