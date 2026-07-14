import React, { useState, useMemo } from 'react';
import type { CommunityEvent } from '../types';
import Card from './Card';
import { communityEventService } from '../services/supabaseService';
import { LOCATION_OPTIONS } from '../constants';
import {
  Plus, Trash2, Pencil, FileDown, Search, X, Eye,
  Calendar, CalendarDays, ChevronLeft, ChevronRight, List as ListIcon,
  MapPin, Users, User, Building2, UserCog, BarChart3, FileText, StickyNote, GraduationCap
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface CommunityEventsCalendarProps {
  events: CommunityEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CommunityEvent[]>>;
  currentUser?: {
    email: string;
    role: 'admin' | 'coordinator' | 'navigator';
    name: string;
  };
}

const emptyForm = {
  date: '',
  topic: '',
  location: '',
  groupPresentedTo: '',
  presenter: '',
  agencyCollaborations: '',
  organiser: '',
  staffPresent: '',
  numberOfAttendees: '',
  demographics: '',
  notes: ''
};

type FormState = typeof emptyForm;

const toDateKey = (d: Date) => {
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CommunityEventsCalendar: React.FC<CommunityEventsCalendarProps> = ({ events, setEvents, currentUser }) => {
  const [view, setView] = useState<'calendar' | 'list' | 'form'>('calendar');
  const [returnView, setReturnView] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);

  const isNavigator = currentUser?.role === 'navigator';
  const canManage = !isNavigator; // navigators can add & view but not edit/delete existing entries

  const filteredEvents = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return events
      .filter(ev => {
        const matchesSearch = !query || [
          ev.topic, ev.location, ev.groupPresentedTo, ev.presenter,
          ev.organiser, ev.staffPresent, ev.agencyCollaborations, ev.demographics, ev.notes
        ].some(field => (field || '').toLowerCase().includes(query));
        const matchesDate = !dateFilter || ev.date === dateFilter;
        return matchesSearch && matchesDate;
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [events, searchQuery, dateFilter]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CommunityEvent[]> = {};
    events.forEach(ev => {
      if (!ev.date) return;
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    return map;
  }, [events]);

  const calendarCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [currentMonth]);

  const goToPrevMonth = () => setCurrentMonth(prev => {
    const d = new Date(prev);
    d.setMonth(d.getMonth() - 1);
    return d;
  });
  const goToNextMonth = () => setCurrentMonth(prev => {
    const d = new Date(prev);
    d.setMonth(d.getMonth() + 1);
    return d;
  });
  const goToToday = () => {
    const d = new Date();
    d.setDate(1);
    setCurrentMonth(d);
  };

  const populateForm = (ev: CommunityEvent): FormState => ({
    date: ev.date || '',
    topic: ev.topic || '',
    location: ev.location || '',
    groupPresentedTo: ev.groupPresentedTo || '',
    presenter: ev.presenter || '',
    agencyCollaborations: ev.agencyCollaborations || '',
    organiser: ev.organiser || '',
    staffPresent: ev.staffPresent || '',
    numberOfAttendees: ev.numberOfAttendees != null ? String(ev.numberOfAttendees) : '',
    demographics: ev.demographics || '',
    notes: ev.notes || ''
  });

  const handleAddNew = (prefillDate?: string) => {
    setSelectedEvent(null);
    setFormData({ ...emptyForm, date: prefillDate || new Date().toISOString().split('T')[0] });
    setIsViewOnly(false);
    setReturnView(view === 'form' ? returnView : (view as 'calendar' | 'list'));
    setView('form');
  };

  const handleView = (ev: CommunityEvent, fromView: 'calendar' | 'list' = 'calendar') => {
    setSelectedEvent(ev);
    setFormData(populateForm(ev));
    setIsViewOnly(true);
    setReturnView(fromView);
    setView('form');
  };

  const handleEdit = (ev: CommunityEvent, fromView: 'calendar' | 'list' = 'list') => {
    setSelectedEvent(ev);
    setFormData(populateForm(ev));
    setIsViewOnly(false);
    setReturnView(fromView);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await communityEventService.delete(id);
        setEvents(events.filter(e => e.id !== id));
      } catch (error) {
        console.error('Error deleting community event:', error);
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.topic.trim()) {
      alert('Please fill in the required fields (Date and Topic/Content of Event)');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        date: formData.date,
        topic: formData.topic.trim(),
        location: formData.location.trim(),
        groupPresentedTo: formData.groupPresentedTo.trim(),
        presenter: formData.presenter.trim(),
        agencyCollaborations: formData.agencyCollaborations.trim(),
        organiser: formData.organiser.trim(),
        staffPresent: formData.staffPresent.trim(),
        numberOfAttendees: formData.numberOfAttendees !== '' ? Number(formData.numberOfAttendees) : null,
        demographics: formData.demographics.trim(),
        notes: formData.notes.trim()
      };

      if (selectedEvent) {
        await communityEventService.update(selectedEvent.id, payload);
        setEvents(events.map(ev => ev.id === selectedEvent.id ? { ...ev, ...payload } : ev));
      } else {
        const newEvent: CommunityEvent = {
          ...payload,
          id: `CEV${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          createdBy: currentUser?.email || 'unknown@multinav.com',
          createdByName: currentUser?.name || 'Unknown User',
          createdByRole: currentUser?.role || 'navigator',
          createdAt: new Date().toISOString()
        };
        await communityEventService.create(newEvent);
        setEvents([newEvent, ...events]);
      }
      setView(returnView);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error saving community event:', error);
      alert('Failed to save event. Please check your database connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setView(returnView);
    setSelectedEvent(null);
    setIsViewOnly(false);
  };

  const clearDateFilter = () => setDateFilter(null);

  const handleDownloadCSV = () => {
    const headers = [
      "ID", "Date", "Topic/Content of Event", "Location", "Group Presented To", "Presenter",
      "Agency Collaborations", "Organiser", "Staff Present", "Number of Attendees",
      "Demographics", "Notes", "Logged By"
    ];
    const csvRows = [
      headers.join(','),
      ...filteredEvents.map(e => [
        e.id,
        e.date,
        e.topic,
        e.location,
        e.groupPresentedTo,
        e.presenter,
        e.agencyCollaborations,
        e.organiser,
        e.staffPresent,
        e.numberOfAttendees ?? '',
        e.demographics,
        e.notes,
        e.createdByName || e.createdBy || 'Unknown'
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'community_events_calendar.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text("Community Events & Education Calendar", pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-AU')} | Total Events: ${filteredEvents.length}`, pageWidth / 2, 22, { align: 'center' });

    const tableHead = [["Date", "Topic/Content", "Location", "Group Presented To", "Presenter", "Organiser", "Attendees", "Staff Present"]];
    const tableBody = filteredEvents.map(e => [
      e.date ? new Date(e.date).toLocaleDateString('en-AU') : 'N/A',
      e.topic || 'N/A',
      e.location || 'N/A',
      e.groupPresentedTo || 'N/A',
      e.presenter || 'N/A',
      e.organiser || 'N/A',
      e.numberOfAttendees != null ? String(e.numberOfAttendees) : 'N/A',
      e.staffPresent || 'N/A'
    ]);

    (doc as any).autoTable({
      head: tableHead,
      body: tableBody,
      startY: 28,
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        valign: 'top'
      },
      headStyles: {
        fillColor: [132, 204, 22],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25 },
        3: { cellWidth: 35 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 },
        6: { cellWidth: 18, halign: 'center' },
        7: { cellWidth: 35 }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      didDrawPage: (data: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
    });

    doc.save('community_events_calendar.pdf');
  };

  const handleDownloadWord = () => {
    const generatedDate = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
    const totalAttendees = filteredEvents.reduce((sum, e) => sum + (e.numberOfAttendees || 0), 0);

    const styles = `<style>
      @page { size: landscape; margin: 1cm; }
      body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #333; }
      h1 { font-size: 20pt; text-align: center; color: #2c5282; margin-bottom: 5px; border-bottom: 3px solid #84cc16; padding-bottom: 10px; }
      .subtitle { text-align: center; color: #666; font-size: 10pt; margin-bottom: 15px; }
      .summary-value { font-size: 18pt; font-weight: bold; color: #84cc16; }
      .summary-label { font-size: 9pt; color: #666; }
      table { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 9pt; }
      th { background-color: #84cc16; color: white; font-weight: bold; padding: 8px 6px; text-align: left; border: 1px solid #6aa313; }
      td { border: 1px solid #d1d5db; padding: 8px 6px; vertical-align: top; }
      tr:nth-child(even) { background-color: #f9fafb; }
      .col-date { width: 70px; text-align: center; }
      .col-attendees { width: 60px; text-align: center; }
      .footer { text-align: center; font-size: 8pt; color: #888; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 8px; }
    </style>`;

    let content = `
      <h1>Community Events &amp; Education Calendar</h1>
      <p class="subtitle">Generated: ${generatedDate} | Total Events: ${filteredEvents.length}</p>
      <table style="width: auto; margin: 0 auto 20px auto; border: none;">
        <tr style="background: none;">
          <td style="border: none; text-align: center; padding: 10px 30px;">
            <div class="summary-value">${filteredEvents.length}</div>
            <div class="summary-label">Total Events</div>
          </td>
          <td style="border: none; text-align: center; padding: 10px 30px;">
            <div class="summary-value" style="color: #2563eb;">${totalAttendees}</div>
            <div class="summary-label">Total Attendees</div>
          </td>
        </tr>
      </table>
    `;

    content += `<table>
      <tr>
        <th class="col-date">Date</th>
        <th>Topic/Content</th>
        <th>Location</th>
        <th>Group Presented To</th>
        <th>Presenter</th>
        <th>Organiser</th>
        <th class="col-attendees">Attendees</th>
        <th>Staff Present</th>
      </tr>`;

    filteredEvents.forEach(e => {
      content += `
        <tr>
          <td class="col-date">${e.date ? new Date(e.date).toLocaleDateString('en-AU') : 'N/A'}</td>
          <td><strong>${e.topic || 'N/A'}</strong></td>
          <td>${e.location || '-'}</td>
          <td>${e.groupPresentedTo || '-'}</td>
          <td>${e.presenter || '-'}</td>
          <td>${e.organiser || '-'}</td>
          <td class="col-attendees">${e.numberOfAttendees != null ? e.numberOfAttendees : '-'}</td>
          <td>${e.staffPresent || '-'}</td>
        </tr>
      `;
    });
    content += `</table>`;

    content += `<div class="footer">
      <p>Community Events &amp; Education Calendar | MultiNav iCRM | Generated: ${generatedDate}</p>
    </div>`;

    const source = `data:application/vnd.ms-word;charset=utf-8,${encodeURIComponent(`<html><head><meta charset="UTF-8">${styles}</head><body>${content}</body></html>`)}`;
    const link = document.createElement("a");
    link.href = source;
    link.download = `Community_Events_Calendar_${new Date().toISOString().split('T')[0]}.doc`;
    link.click();
  };

  // ---------- Form View ----------
  if (view === 'form') {
    return (
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {isViewOnly ? 'View Community Event' : (selectedEvent ? 'Edit Community Event' : 'Log New Community Event')}
          </h2>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 mr-2 text-lime-green-500" />
                Date <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                disabled={isViewOnly}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
                required
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="w-4 h-4 mr-2 text-lime-green-500" />
                Location
              </label>
              <input
                type="text"
                list="community-event-location-options"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Select or type a location"
                disabled={isViewOnly}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
              />
              <datalist id="community-event-location-options">
                {LOCATION_OPTIONS.map(loc => <option key={loc} value={loc} />)}
              </datalist>
            </div>
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="w-4 h-4 mr-2 text-lime-green-500" />
              Topic / Content of Event <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="What was the event about? e.g. Diabetes prevention information session"
              rows={2}
              disabled={isViewOnly}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="w-4 h-4 mr-2 text-lime-green-500" />
                Group Presented To
              </label>
              <input
                type="text"
                value={formData.groupPresentedTo}
                onChange={(e) => setFormData({ ...formData, groupPresentedTo: e.target.value })}
                placeholder="e.g. Aged care residents, migrant women's group"
                disabled={isViewOnly}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="w-4 h-4 mr-2 text-lime-green-500" />
                Presenter
              </label>
              <input
                type="text"
                value={formData.presenter}
                onChange={(e) => setFormData({ ...formData, presenter: e.target.value })}
                placeholder="Who delivered the session?"
                disabled={isViewOnly}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Building2 className="w-4 h-4 mr-2 text-lime-green-500" />
                Agency Collaborations
              </label>
              <input
                type="text"
                value={formData.agencyCollaborations}
                onChange={(e) => setFormData({ ...formData, agencyCollaborations: e.target.value })}
                placeholder="Partner agencies involved, if any"
                disabled={isViewOnly}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <UserCog className="w-4 h-4 mr-2 text-lime-green-500" />
                Organiser
              </label>
              <input
                type="text"
                value={formData.organiser}
                onChange={(e) => setFormData({ ...formData, organiser: e.target.value })}
                placeholder="Who organised the event?"
                disabled={isViewOnly}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="w-4 h-4 mr-2 text-lime-green-500" />
                Staff Present
              </label>
              <input
                type="text"
                value={formData.staffPresent}
                onChange={(e) => setFormData({ ...formData, staffPresent: e.target.value })}
                placeholder="Names of staff who attended"
                disabled={isViewOnly}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <BarChart3 className="w-4 h-4 mr-2 text-lime-green-500" />
                Number of Attendees
              </label>
              <input
                type="number"
                min={0}
                value={formData.numberOfAttendees}
                onChange={(e) => setFormData({ ...formData, numberOfAttendees: e.target.value })}
                placeholder="e.g. 25"
                disabled={isViewOnly}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <GraduationCap className="w-4 h-4 mr-2 text-lime-green-500" />
              Demographics
            </label>
            <textarea
              value={formData.demographics}
              onChange={(e) => setFormData({ ...formData, demographics: e.target.value })}
              placeholder="Describe the demographic makeup of attendees, e.g. ethnicity, age group, gender"
              rows={3}
              disabled={isViewOnly}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <StickyNote className="w-4 h-4 mr-2 text-lime-green-500" />
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any other notes, outcomes, or follow-up actions"
              rows={4}
              disabled={isViewOnly}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-green-500"
            >
              {isViewOnly ? 'Back' : 'Cancel'}
            </button>
            {!isViewOnly && (
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-lime-green-500 hover:bg-lime-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : (selectedEvent ? 'Update Event' : 'Save Event')}
              </button>
            )}
          </div>
        </form>
      </Card>
    );
  }

  // ---------- Calendar / List Views ----------
  return (
    <Card>
      <div className="flex justify-between items-start md:items-center mb-4 flex-col md:flex-row gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Community Events &amp; Education Calendar</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Community events and education sessions, visible to all staff
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'calendar' ? 'bg-white dark:bg-gray-800 text-lime-green-600 shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <CalendarDays className="w-4 h-4" /> Calendar
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'list' ? 'bg-white dark:bg-gray-800 text-lime-green-600 shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <ListIcon className="w-4 h-4" /> List
            </button>
          </div>
          <button
            onClick={handleDownloadCSV}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
            title="Download as CSV"
          >
            <FileDown className="mr-2 h-4 w-4" /> CSV
          </button>
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
            title="Download as PDF"
          >
            <FileDown className="mr-2 h-4 w-4" /> PDF
          </button>
          <button
            onClick={handleDownloadWord}
            className="inline-flex items-center px-3 py-2 border border-blue-300 dark:border-blue-500 text-sm font-medium rounded-md shadow-sm text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 focus:outline-none"
            title="Download as Word Document"
          >
            <FileText className="mr-2 h-4 w-4" /> Word
          </button>
          <button
            onClick={() => handleAddNew()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-lime-green-500 hover:bg-lime-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-green-500"
          >
            <Plus className="mr-2 h-5 w-5" />
            Log New Event
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevMonth}
                className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 w-40 text-center">
                {currentMonth.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={goToNextMonth}
                className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={goToToday}
                className="ml-1 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Today
              </button>
            </div>
            {dateFilter && (
              <button
                onClick={() => { clearDateFilter(); setView('calendar'); }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full bg-baby-blue-100 dark:bg-baby-blue-900/40 text-baby-blue-700 dark:text-baby-blue-300"
              >
                Filtered: {new Date(dateFilter).toLocaleDateString('en-AU')} <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {WEEKDAY_LABELS.map(label => (
              <div key={label} className="bg-gray-100 dark:bg-gray-800 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 py-2">
                {label}
              </div>
            ))}
            {calendarCells.map((date, idx) => {
              if (!date) {
                return <div key={idx} className="bg-gray-50 dark:bg-gray-900/40 min-h-[100px]" />;
              }
              const key = toDateKey(date);
              const dayEvents = eventsByDate[key] || [];
              const isToday = key === toDateKey(new Date());
              return (
                <div
                  key={idx}
                  className={`relative group bg-white dark:bg-gray-800 min-h-[100px] p-1.5 flex flex-col ${isToday ? 'ring-2 ring-inset ring-lime-green-500' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isToday ? 'text-lime-green-600 dark:text-lime-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {date.getDate()}
                    </span>
                    <button
                      onClick={() => handleAddNew(key)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-lime-green-100 dark:hover:bg-lime-green-900/40 text-lime-green-600"
                      title="Add event on this day"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="mt-1 space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map(ev => (
                      <button
                        key={ev.id}
                        onClick={() => handleView(ev, 'calendar')}
                        className="w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded bg-lime-green-100 dark:bg-lime-green-900/40 text-lime-green-800 dark:text-lime-green-200 hover:bg-lime-green-200 dark:hover:bg-lime-green-900/70 truncate"
                        title={ev.topic}
                      >
                        {ev.topic}
                      </button>
                    ))}
                    {dayEvents.length > 2 && (
                      <button
                        onClick={() => { setDateFilter(key); setView('list'); }}
                        className="text-[11px] text-baby-blue-600 dark:text-baby-blue-400 hover:underline pl-1.5"
                      >
                        +{dayEvents.length - 2} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative max-w-sm flex-1 min-w-[200px]">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by topic, location, presenter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 pl-10 focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            {dateFilter && (
              <button
                onClick={clearDateFilter}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full bg-baby-blue-100 dark:bg-baby-blue-900/40 text-baby-blue-700 dark:text-baby-blue-300"
              >
                {new Date(dateFilter).toLocaleDateString('en-AU')} <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 table-fixed">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th scope="col" className="px-3 py-3 w-24">Date</th>
                  <th scope="col" className="px-3 py-3">Topic / Content</th>
                  <th scope="col" className="px-3 py-3 w-28">Location</th>
                  <th scope="col" className="px-3 py-3 w-36">Group Presented To</th>
                  <th scope="col" className="px-3 py-3 w-28">Presenter</th>
                  <th scope="col" className="px-3 py-3 w-20 text-center">Attendees</th>
                  <th scope="col" className="px-3 py-3 w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length > 0 ? filteredEvents.map(ev => (
                  <tr key={ev.id} className="bg-white border-b dark:bg-gray-900 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white text-xs">
                      {ev.date ? new Date(ev.date).toLocaleDateString('en-AU') : 'N/A'}
                    </td>
                    <td className="px-3 py-4">
                      <span className="font-medium text-gray-900 dark:text-white text-xs line-clamp-2">{ev.topic}</span>
                    </td>
                    <td className="px-3 py-4 text-xs">
                      {ev.location || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-4 text-xs">
                      {ev.groupPresentedTo || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-4 text-xs">
                      {ev.presenter || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-4 text-xs text-center">
                      {ev.numberOfAttendees != null ? ev.numberOfAttendees : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleView(ev, 'list')}
                          className="p-1 text-gray-500 hover:text-baby-blue-600 dark:hover:text-baby-blue-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleEdit(ev, 'list')}
                              className="p-1 text-gray-500 hover:text-lime-green-600 dark:hover:text-lime-green-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(ev.id)}
                              className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-500 dark:text-gray-400">
                      {searchQuery || dateFilter ? 'No events match your search.' : 'No events logged yet. Add a new event to get started.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CommunityEventsCalendar;
