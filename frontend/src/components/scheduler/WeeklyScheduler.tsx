"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Download, Edit, Trash2, Plus, Save, X, Check } from 'lucide-react';
import jsPDF from 'jspdf';

// Types for the scheduler
interface ScheduleCell {
  time: string;
  day: string;
  content: string;
  isCompleted: boolean;
}

interface WeeklySchedule {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  cells: ScheduleCell[];
  createdAt: Date;
  updatedAt: Date;
}

interface TimeSlot {
  time: string;
  hour: number;
}

const WeeklyScheduler: React.FC = () => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<WeeklySchedule | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingCell, setEditingCell] = useState<{ time: string; day: string } | null>(null);
  const [cellContent, setCellContent] = useState('');
  const [newScheduleName, setNewScheduleName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [showExistingSchedules, setShowExistingSchedules] = useState(false);

  // Generate time slots from 00:00 to 23:00
  const timeSlots: TimeSlot[] = Array.from({ length: 24 }, (_, i) => ({
    time: `${i.toString().padStart(2, '0')}:00`,
    hour: i
  }));

  // Generate days of the week
  const getDaysOfWeek = (startDate: Date): string[] => {
    const days = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(dayNames[date.getDay()]);
    }
    
    return days;
  };

  // Get dates for the week
  const getWeekDates = (startDate: Date): Date[] => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Update current date/time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load schedules from localStorage on mount
  useEffect(() => {
    const savedSchedules = localStorage.getItem('weeklySchedules');
    if (savedSchedules) {
      const parsed = JSON.parse(savedSchedules);
      setSchedules(parsed.map((s: any) => ({
        ...s,
        startDate: new Date(s.startDate),
        endDate: new Date(s.endDate),
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt)
      })));
    }
  }, []);

  // Save schedules to localStorage whenever they change
  useEffect(() => {
    if (schedules.length > 0) {
      localStorage.setItem('weeklySchedules', JSON.stringify(schedules));
    }
  }, [schedules]);

  // Validate date - only future dates allowed
  const validateStartDate = (dateString: string): boolean => {
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return selectedDate > today;
  };

  // Check if date range conflicts with existing schedules
  const hasDateConflict = (startDate: Date, excludeId?: string): boolean => {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return schedules.some(schedule => {
      if (excludeId && schedule.id === excludeId) return false;
      
      const scheduleStart = new Date(schedule.startDate);
      const scheduleEnd = new Date(schedule.endDate);
      
      return (
        (startDate >= scheduleStart && startDate <= scheduleEnd) ||
        (endDate >= scheduleStart && endDate <= scheduleEnd) ||
        (startDate <= scheduleStart && endDate >= scheduleEnd)
      );
    });
  };

  // Create new schedule
  const createNewSchedule = () => {
    if (!newScheduleName || !newStartDate) {
      alert('Please fill in all fields');
      return;
    }

    if (!validateStartDate(newStartDate)) {
      alert('Start date must be a future date (not today or past dates)');
      return;
    }

    const startDate = new Date(newStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    if (hasDateConflict(startDate)) {
      alert('This date range conflicts with an existing schedule');
      return;
    }

    const newSchedule: WeeklySchedule = {
      id: Date.now().toString(),
      name: newScheduleName,
      startDate,
      endDate,
      cells: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setSchedules([...schedules, newSchedule]);
    setSelectedSchedule(newSchedule);
    setIsCreatingNew(false);
    setNewScheduleName('');
    setNewStartDate('');
  };

  // Delete schedule
  const deleteSchedule = (id: string) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      setSchedules(schedules.filter(s => s.id !== id));
      if (selectedSchedule?.id === id) {
        setSelectedSchedule(null);
      }
    }
  };

  // Update cell content
  const updateCell = (time: string, day: string, content: string, isCompleted: boolean = false) => {
    if (!selectedSchedule) return;

    const updatedCells = selectedSchedule.cells.filter(
      cell => !(cell.time === time && cell.day === day)
    );

    if (content.trim()) {
      updatedCells.push({ time, day, content: content.trim(), isCompleted });
    }

    const updatedSchedule = {
      ...selectedSchedule,
      cells: updatedCells,
      updatedAt: new Date()
    };

    setSelectedSchedule(updatedSchedule);
    setSchedules(schedules.map(s => s.id === selectedSchedule.id ? updatedSchedule : s));
  };

  // Toggle cell completion
  const toggleCellCompletion = (time: string, day: string) => {
    if (!selectedSchedule) return;

    const cell = selectedSchedule.cells.find(c => c.time === time && c.day === day);
    if (cell) {
      updateCell(time, day, cell.content, !cell.isCompleted);
    }
  };

  // Handle cell editing
  const startEditingCell = (time: string, day: string) => {
    const cell = selectedSchedule?.cells.find(c => c.time === time && c.day === day);
    setEditingCell({ time, day });
    setCellContent(cell?.content || '');
  };

  const saveCellEdit = () => {
    if (editingCell) {
      updateCell(editingCell.time, editingCell.day, cellContent);
      setEditingCell(null);
      setCellContent('');
    }
  };

  const cancelCellEdit = () => {
    setEditingCell(null);
    setCellContent('');
  };

  // Get cell content for display
  const getCellContent = (time: string, day: string): ScheduleCell | null => {
    return selectedSchedule?.cells.find(c => c.time === time && c.day === day) || null;
  };

  // Download schedule as PDF
  const downloadSchedule = () => {
    if (!selectedSchedule) return;

    const doc = new jsPDF();
    
    // Set font to support more characters
    doc.setFont('helvetica');
    
    // Title
    doc.setFontSize(20);
    doc.text(`Weekly Schedule: ${selectedSchedule.name}`, 20, 20);
    
    // Date range
    doc.setFontSize(12);
    doc.text(
      `Week: ${selectedSchedule.startDate.toLocaleDateString()} - ${selectedSchedule.endDate.toLocaleDateString()}`,
      20,
      30
    );
    
    // Current date
    doc.text(
      `Generated: ${new Date().toLocaleDateString()}`,
      20,
      40
    );
    
    // Get days and prepare table
    const days = getDaysOfWeek(selectedSchedule.startDate);
    const weekDates = getWeekDates(selectedSchedule.startDate);
    
    // Table headers
    let yPosition = 60;
    const cellWidth = 25;
    const cellHeight = 8;
    const timeColumnWidth = 20;
    
    // Draw table headers
    doc.setFontSize(10);
    doc.text('Time', 20, yPosition);
    
    days.forEach((day, index) => {
      const x = 20 + timeColumnWidth + (index * cellWidth);
      // Day name
      doc.text(day, x, yPosition - 5);
      // Date
      doc.setFontSize(8);
      doc.text(weekDates[index].toLocaleDateString(), x, yPosition + 2);
      doc.setFontSize(10);
    });
    
    // Draw horizontal line after headers
    doc.line(20, yPosition + 5, 20 + timeColumnWidth + (days.length * cellWidth), yPosition + 5);
    
    yPosition += 10;
    
    // Draw table rows
    timeSlots.forEach(slot => {
      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Time column
      doc.text(slot.time, 20, yPosition);
      
      // Day columns
      days.forEach((day, index) => {
        const x = 20 + timeColumnWidth + (index * cellWidth);
        const cell = getCellContent(slot.time, day);
        
        if (cell && cell.content) {
          // Add checkmark if completed
          let content = cell.content;
          if (cell.isCompleted) {
            content = '✓ ' + content;
          }
          
          // Truncate content if too long
          if (content.length > 15) {
            content = content.substring(0, 12) + '...';
          }
          
          doc.setFontSize(8);
          doc.text(content, x, yPosition);
          doc.setFontSize(10);
        }
      });
      
      yPosition += cellHeight;
    });
    
    // Add legend at the bottom
    const finalY = yPosition + 10;
    if (finalY < 270) {
      doc.setFontSize(10);
      doc.text('Legend: ✓ = Completed Task', 20, finalY);
    }
    
    // Save the PDF
    doc.save(`${selectedSchedule.name.replace(/\s+/g, '_')}_schedule.pdf`);
  };

  // Get min date for date input (tomorrow)
  const getMinDate = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="p-6 max-w-full mx-auto">
      {/* Live Date/Time Display */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Weekly Scheduler</h2>
              <p className="text-sm opacity-90">
                {currentDateTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-lg font-mono">
                {currentDateTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <button
              onClick={() => setShowExistingSchedules(!showExistingSchedules)}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
            >
              {showExistingSchedules ? 'Hide' : 'Show'} Existing Schedules ({schedules.length})
            </button>
          </div>
        </div>
      </div>

      {/* Existing Schedules */}
      {showExistingSchedules && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Existing Schedules</h3>
          {schedules.length === 0 ? (
            <p className="text-gray-500">No schedules created yet</p>
          ) : (
            <div className="grid gap-2">
              {schedules.map(schedule => (
                <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{schedule.name}</h4>
                    <p className="text-sm text-gray-600">
                      {schedule.startDate.toLocaleDateString()} - {schedule.endDate.toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Created: {schedule.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedSchedule(schedule)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => deleteSchedule(schedule.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create New Schedule or Display Selected Schedule */}
      {!selectedSchedule ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Weekly Schedule</h3>
          
          {!isCreatingNew ? (
            <button
              onClick={() => setIsCreatingNew(true)}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Schedule</span>
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Name
                </label>
                <input
                  type="text"
                  value={newScheduleName}
                  onChange={(e) => setNewScheduleName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter schedule name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date (must be future date)
                </label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  min={getMinDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will create a 7-day schedule starting from this date
                </p>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={createNewSchedule}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                >
                  Create Schedule
                </button>
                <button
                  onClick={() => {
                    setIsCreatingNew(false);
                    setNewScheduleName('');
                    setNewStartDate('');
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Schedule Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold">{selectedSchedule.name}</h3>
              <p className="text-gray-600">
                {selectedSchedule.startDate.toLocaleDateString()} - {selectedSchedule.endDate.toLocaleDateString()}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={downloadSchedule}
                className="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-1"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              <button
                onClick={() => setSelectedSchedule(null)}
                className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600"
              >
                Back to List
              </button>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-gray-300 bg-gray-50 p-2 text-sm font-medium">Time</th>
                  {getDaysOfWeek(selectedSchedule.startDate).map((day, index) => (
                    <th key={day} className="border border-gray-300 bg-gray-50 p-2 text-sm font-medium">
                      <div>{day}</div>
                      <div className="text-xs text-gray-500">
                        {getWeekDates(selectedSchedule.startDate)[index].toLocaleDateString()}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(slot => (
                  <tr key={slot.time}>
                    <td className="border border-gray-300 bg-gray-50 p-2 text-sm font-medium">
                      {slot.time}
                    </td>
                    {getDaysOfWeek(selectedSchedule.startDate).map(day => {
                      const cell = getCellContent(slot.time, day);
                      const isEditing = editingCell?.time === slot.time && editingCell?.day === day;
                      
                      return (
                        <td 
                          key={day} 
                          className={`border border-gray-300 p-2 align-top min-w-[120px] ${
                            cell?.isCompleted ? 'bg-green-50' : ''
                          }`}
                        >
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={cellContent}
                                onChange={(e) => setCellContent(e.target.value)}
                                className="w-full p-1 border border-blue-300 rounded text-sm resize-none"
                                rows={2}
                                autoFocus
                              />
                              <div className="flex space-x-1">
                                <button
                                  onClick={saveCellEdit}
                                  className="bg-green-500 text-white p-1 rounded hover:bg-green-600"
                                >
                                  <Save className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={cancelCellEdit}
                                  className="bg-red-500 text-white p-1 rounded hover:bg-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="min-h-[40px]">
                              {cell && (
                                <div className="space-y-1">
                                  <div className="flex items-start justify-between">
                                    <p className="text-sm flex-1">{cell.content}</p>
                                    {cell.isCompleted && (
                                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => startEditingCell(slot.time, day)}
                                      className="text-blue-500 hover:text-blue-700"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => toggleCellCompletion(slot.time, day)}
                                      className={`${
                                        cell.isCompleted ? 'text-green-600' : 'text-gray-400'
                                      } hover:text-green-700`}
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                              {!cell && (
                                <button
                                  onClick={() => startEditingCell(slot.time, day)}
                                  className="text-gray-400 hover:text-blue-500"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyScheduler;
