import React, { useState, useMemo } from 'react';
import type { Client, HealthActivity } from '../types';
import Card from './Card';
import { Calendar, Download, Filter, Users, HeartPulse, TrendingUp, Activity, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface UnifiedReportingProps {
  clients: Client[];
  activities: HealthActivity[];
}

const UnifiedReporting: React.FC<UnifiedReportingProps> = ({ clients, activities }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedSection, setExpandedSection] = useState<'clients' | 'activities' | null>('clients');
  const [selectedEthnicity, setSelectedEthnicity] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState<'all' | 'Perth North' | 'Perth South'>('all');

  // Filter data based on date range and region
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const referralDate = new Date(client.referralDate);
      const start = startDate ? new Date(startDate) : new Date('2000-01-01');
      const end = endDate ? new Date(endDate) : new Date();
      
      const dateMatch = referralDate >= start && referralDate <= end;
      const ethnicityMatch = selectedEthnicity === 'all' || client.ethnicity === selectedEthnicity;
      const regionMatch = selectedRegion === 'all' || client.region === selectedRegion;
      
      return dateMatch && ethnicityMatch && regionMatch;
    });
  }, [clients, startDate, endDate, selectedEthnicity, selectedRegion]);

  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const activityDate = new Date(activity.date);
      const start = startDate ? new Date(startDate) : new Date('2000-01-01');
      const end = endDate ? new Date(endDate) : new Date();
      
      // Check if activity belongs to a client in the selected region
      const client = clients.find(c => c.id === activity.clientId);
      const regionMatch = selectedRegion === 'all' || (client && client.region === selectedRegion);
      
      const dateMatch = activityDate >= start && activityDate <= end;
      const serviceMatch = selectedService === 'all' || 
        activity.servicesAccessed.includes(selectedService);
      
      return dateMatch && serviceMatch && regionMatch;
    });
  }, [activities, startDate, endDate, selectedService, selectedRegion, clients]);

  // Calculate statistics
  const clientStats = useMemo(() => {
    const ethnicityCount = filteredClients.reduce((acc: Record<string, number>, client) => {
      acc[client.ethnicity] = (acc[client.ethnicity] || 0) + 1;
      return acc;
    }, {});

    const referralSourceCount = filteredClients.reduce((acc: Record<string, number>, client) => {
      acc[client.referralSource] = (acc[client.referralSource] || 0) + 1;
      return acc;
    }, {});

    const regionCount = filteredClients.reduce((acc: Record<string, number>, client) => {
      const region = client.region || 'Not Specified';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {});

    const ageGroups = {
      '0-17': 0,
      '18-30': 0,
      '31-50': 0,
      '51-65': 0,
      '65+': 0
    };

    filteredClients.forEach(client => {
      const age = client.age || 0;
      if (age < 18) ageGroups['0-17']++;
      else if (age <= 30) ageGroups['18-30']++;
      else if (age <= 50) ageGroups['31-50']++;
      else if (age <= 65) ageGroups['51-65']++;
      else ageGroups['65+']++;
    });

    return {
      total: filteredClients.length,
      ethnicityCount,
      referralSourceCount,
      regionCount,
      ageGroups,
      averageAge: filteredClients.reduce((sum, c) => sum + (c.age || 0), 0) / filteredClients.length || 0
    };
  }, [filteredClients]);

  const activityStats = useMemo(() => {
    const servicesCount = filteredActivities.flatMap(a => a.servicesAccessed)
      .reduce((acc: Record<string, number>, service) => {
        acc[service] = (acc[service] || 0) + 1;
        return acc;
      }, {});

    const navigationCount = filteredActivities.flatMap(a => a.navigationAssistance)
      .reduce((acc: Record<string, number>, assistance) => {
        acc[assistance] = (acc[assistance] || 0) + 1;
        return acc;
      }, {});

    const clientsServed = new Set(filteredActivities.map(a => a.clientId)).size;
    
    // Calculate total individual activities including discharges
    const totalNavigationItems = filteredActivities.reduce((sum, a) => {
      let count = a.navigationAssistance.length;
      // Count "Other" checkbox if there's other assistance text
      if (a.otherAssistance) count++;
      return sum + count;
    }, 0);
    
    const totalServiceItems = filteredActivities.reduce((sum, a) => {
      let count = a.servicesAccessed.length;
      // Count "Other" checkbox if there's other education text
      if (a.otherEducation) count++;
      return sum + count;
    }, 0);
    
    const totalDischarges = filteredActivities.filter(a => a.isDischarge).length;
    const totalActivityItems = totalNavigationItems + totalServiceItems + totalDischarges;

    return {
      total: filteredActivities.length,
      totalItems: totalActivityItems,
      totalNavigationItems,
      totalServiceItems,
      totalDischarges,
      servicesCount,
      navigationCount,
      clientsServed,
      averageActivitiesPerClient: filteredActivities.length / clientsServed || 0
    };
  }, [filteredActivities]);

  // Get unique values for filters
  const uniqueEthnicities = useMemo(() => 
    [...new Set(clients.map(c => c.ethnicity))].sort(),
    [clients]
  );

  const uniqueServices = useMemo(() => 
    [...new Set(activities.flatMap(a => a.servicesAccessed))].sort(),
    [activities]
  );

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(20);
    doc.text('Unified Health Navigation Report', pageWidth / 2, 20, { align: 'center' });
    
    // Date range
    doc.setFontSize(12);
    const dateText = `Period: ${startDate || 'All time'} to ${endDate || 'Present'}`;
    doc.text(dateText, pageWidth / 2, 30, { align: 'center' });
    
    let yPosition = 45;
    
    // Client Management Section
    doc.setFontSize(16);
    doc.text('Client Management Report', 14, yPosition);
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.text(`Total Clients: ${clientStats.total}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Average Age: ${clientStats.averageAge.toFixed(1)} years`, 14, yPosition);
    yPosition += 10;
    
    // Ethnicity table
    const ethnicityData = Object.entries(clientStats.ethnicityCount)
      .map(([ethnicity, count]) => [ethnicity, count.toString()]);
    
    if (ethnicityData.length > 0) {
      (doc as any).autoTable({
        head: [['Ethnicity', 'Count']],
        body: ethnicityData,
        startY: yPosition,
        margin: { left: 14 },
        styles: { fontSize: 10 },
        headStyles: { fillColor: [132, 204, 22] }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Health Navigation Section
    doc.setFontSize(16);
    doc.text('Health Navigation Activities', 14, yPosition);
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.text(`Total Activities: ${activityStats.total}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Clients Served: ${activityStats.clientsServed}`, 14, yPosition);
    yPosition += 7;
    doc.text(`Average Activities per Client: ${activityStats.averageActivitiesPerClient.toFixed(1)}`, 14, yPosition);
    yPosition += 10;
    
    // Services table
    const servicesData = Object.entries(activityStats.servicesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([service, count]) => [service, count.toString()]);
    
    if (servicesData.length > 0) {
      (doc as any).autoTable({
        head: [['Service Accessed', 'Count']],
        body: servicesData,
        startY: yPosition,
        margin: { left: 14 },
        styles: { fontSize: 10 },
        headStyles: { fillColor: [132, 204, 22] }
      });
    }
    
    doc.save(`unified-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; subtitle?: string }> = 
    ({ title, value, icon, color, subtitle }) => (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border-l-4 ${color}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className="text-gray-400">{icon}</div>
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-lime-green-500" />
              Unified Reporting Dashboard
            </h2>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-lime-green-500 text-white rounded-lg hover:bg-lime-green-600 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>

          {/* Date and Region Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Region
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value as 'all' | 'Perth North' | 'Perth South')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Regions</option>
                <option value="Perth North">Perth North</option>
                <option value="Perth South">Perth South</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Ethnicity
              </label>
              <select
                value={selectedEthnicity}
                onChange={(e) => setSelectedEthnicity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Ethnicities</option>
                {uniqueEthnicities.map(ethnicity => (
                  <option key={ethnicity} value={ethnicity}>{ethnicity}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Service
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Services</option>
                {uniqueServices.map(service => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Clients" 
          value={clientStats.total} 
          icon={<Users className="h-8 w-8" />}
          color="border-blue-500"
        />
        <StatCard 
          title="Total Activities" 
          value={activityStats.totalItems} 
          icon={<Activity className="h-8 w-8" />}
          color="border-green-500"
          subtitle={`${activityStats.totalNavigationItems} Navigation, ${activityStats.totalServiceItems} Services, ${activityStats.totalDischarges} Discharges`}
        />
        <StatCard 
          title="Clients Served" 
          value={activityStats.clientsServed} 
          icon={<HeartPulse className="h-8 w-8" />}
          color="border-purple-500"
        />
        <StatCard 
          title="Avg Age" 
          value={clientStats.averageAge.toFixed(1)} 
          icon={<TrendingUp className="h-8 w-8" />}
          color="border-orange-500"
        />
      </div>

      {/* Client Management Section */}
      <Card>
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpandedSection(expandedSection === 'clients' ? null : 'clients')}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-lime-green-500" />
            Client Management Report
          </h3>
          {expandedSection === 'clients' ? 
            <ChevronUp className="h-5 w-5 text-gray-500" /> : 
            <ChevronDown className="h-5 w-5 text-gray-500" />
          }
        </div>
        
        {expandedSection === 'clients' && (
          <div className="mt-6 space-y-6">
            {/* Age Distribution */}
            <div>
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Age Distribution</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(clientStats.ageGroups).map(([group, count]) => (
                  <div key={group} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{group}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ethnicity Breakdown */}
            <div>
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Ethnicity Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(clientStats.ethnicityCount)
                  .sort((a, b) => b[1] - a[1])
                  .map(([ethnicity, count]) => (
                    <div key={ethnicity} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{ethnicity}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{count}</p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Referral Sources */}
            <div>
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Referral Sources</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(clientStats.referralSourceCount)
                  .sort((a, b) => b[1] - a[1])
                  .map(([source, count]) => (
                    <div key={source} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{source}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{count}</p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Region Distribution */}
            <div>
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Region Distribution</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(clientStats.regionCount)
                  .sort((a, b) => b[1] - a[1])
                  .map(([region, count]) => (
                    <div key={region} className="bg-baby-blue-50 dark:bg-gray-700 rounded-lg p-4 border border-baby-blue-200 dark:border-gray-600">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{region}</p>
                      <p className="text-2xl font-bold text-baby-blue-600 dark:text-baby-blue-400">{count}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {((count / clientStats.total) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Health Navigation Section */}
      <Card>
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpandedSection(expandedSection === 'activities' ? null : 'activities')}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-lime-green-500" />
            Health Navigation Activities Report
          </h3>
          {expandedSection === 'activities' ? 
            <ChevronUp className="h-5 w-5 text-gray-500" /> : 
            <ChevronDown className="h-5 w-5 text-gray-500" />
          }
        </div>
        
        {expandedSection === 'activities' && (
          <div className="mt-6 space-y-6">
            {/* Top Services */}
            <div>
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Services Accessed</h4>
              <div className="space-y-2">
                {Object.entries(activityStats.servicesCount)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([service, count]) => (
                    <div key={service} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{service}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-lime-green-500 h-2 rounded-full"
                            style={{ width: `${(count / Math.max(...Object.values(activityStats.servicesCount))) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white min-w-[30px] text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Navigation Assistance */}
            <div>
              <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">Navigation Assistance Provided</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(activityStats.navigationCount)
                  .sort((a, b) => b[1] - a[1])
                  .map(([assistance, count]) => (
                    <div key={assistance} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex justify-between items-center">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{assistance}</span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default UnifiedReporting;







