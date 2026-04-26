"use client";

import React, { useEffect, useState } from 'react';
import { Clock, Download, Edit, Plus, Save, X, Check } from 'lucide-react';

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

interface SerializedWeeklySchedule {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  cells: ScheduleCell[];
  createdAt: string;
  updatedAt: string;
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

  const timeSlots: TimeSlot[] = Array.from({ length: 24 }, (_, i) => ({
    time: `${i.toString().padStart(2, '0')}:00`,
    hour: i,
  }));

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

  const getWeekDates = (startDate: Date): Date[] => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const savedSchedules = localStorage.getItem('weeklySchedules');
    if (!savedSchedules) return;

    const parsed: SerializedWeeklySchedule[] = JSON.parse(savedSchedules);
    setSchedules(
      parsed.map((schedule) => ({
        ...schedule,
        startDate: new Date(schedule.startDate),
        endDate: new Date(schedule.endDate),
        createdAt: new Date(schedule.createdAt),
        updatedAt: new Date(schedule.updatedAt),
      }))
    );
  }, []);

  useEffect(() => {
    if (schedules.length > 0) {
      localStorage.setItem('weeklySchedules', JSON.stringify(schedules));
    }
  }, [schedules]);

  const validateStartDate = (dateString: string): boolean => {
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return selectedDate > today;
  };

  const hasDateConflict = (startDate: Date, excludeId?: string): boolean => {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    return schedules.some((schedule) => {
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
      updatedAt: new Date(),
    };

    setSchedules([...schedules, newSchedule]);
    setSelectedSchedule(newSchedule);
    setIsCreatingNew(false);
    setNewScheduleName('');
    setNewStartDate('');
  };

  const deleteSchedule = (id: string) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      setSchedules(schedules.filter((schedule) => schedule.id !== id));
      if (selectedSchedule?.id === id) {
        setSelectedSchedule(null);
      }
    }
  };

  const updateCell = (time: string, day: string, content: string, isCompleted = false) => {
    if (!selectedSchedule) return;

    const updatedCells = selectedSchedule.cells.filter(
      (cell) => !(cell.time === time && cell.day === day)
    );

    if (content.trim()) {
      updatedCells.push({ time, day, content: content.trim(), isCompleted });
    }

    const updatedSchedule = {
      ...selectedSchedule,
      cells: updatedCells,
      updatedAt: new Date(),
    };

    setSelectedSchedule(updatedSchedule);
    setSchedules(schedules.map((schedule) => (schedule.id === selectedSchedule.id ? updatedSchedule : schedule)));
  };

  const toggleCellCompletion = (time: string, day: string) => {
    if (!selectedSchedule) return;

    const cell = selectedSchedule.cells.find((item) => item.time === time && item.day === day);
    if (cell) {
      updateCell(time, day, cell.content, !cell.isCompleted);
    }
  };

  const startEditingCell = (time: string, day: string) => {
    const cell = selectedSchedule?.cells.find((item) => item.time === time && item.day === day);
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

  const getCellContent = (time: string, day: string): ScheduleCell | null => {
    return selectedSchedule?.cells.find((cell) => cell.time === time && cell.day === day) || null;
  };

  const downloadSchedule = () => {
    if (!selectedSchedule) return;

    const days = getDaysOfWeek(selectedSchedule.startDate);
    const weekDates = getWeekDates(selectedSchedule.startDate);
    const lines = [
      `Weekly Schedule: ${selectedSchedule.name}`,
      `Week: ${selectedSchedule.startDate.toLocaleDateString()} - ${selectedSchedule.endDate.toLocaleDateString()}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
    ];

    timeSlots.forEach((slot) => {
      lines.push(slot.time);
      days.forEach((day, index) => {
        const cell = getCellContent(slot.time, day);
        const content = cell?.content?.trim() || '-';
        const status = cell ? (cell.isCompleted ? '[Done]' : '[Pending]') : '';
        lines.push(`  ${day} (${weekDates[index].toLocaleDateString()}): ${content} ${status}`.trimEnd());
      });
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedSchedule.name.replace(/\s+/g, '_')}_schedule.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getMinDate = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="p-6 max-w-full mx-auto">
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
                  day: 'numeric',
                })}
              </p>
              <p className="text-lg font-mono">
                {currentDateTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
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

      {showExistingSchedules && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">Existing Schedules</h3>
          {schedules.length === 0 ? (
            <p className="text-gray-500">No schedules created yet</p>
          ) : (
            <div className="grid gap-2">
              {schedules.map((schedule) => (
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
                {timeSlots.map((slot) => (
                  <tr key={slot.time}>
                    <td className="border border-gray-300 bg-gray-50 p-2 text-sm font-medium">
                      {slot.time}
                    </td>
                    {getDaysOfWeek(selectedSchedule.startDate).map((day) => {
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
