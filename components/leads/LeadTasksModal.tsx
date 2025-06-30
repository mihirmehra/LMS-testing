'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lead } from '@/types/lead';
import { useAuth } from '@/hooks/useAuth';
import { CheckSquare, Plus, Calendar, Clock, User, AlertCircle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Completed';
  assignedTo: string;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
}

interface LeadTasksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
}

export function LeadTasksModal({ open, onOpenChange, lead }: LeadTasksModalProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'task-1',
      title: 'Follow up call',
      description: 'Call to discuss property requirements',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      priority: 'High',
      status: 'Pending',
      assignedTo: user?.name || 'Current User',
      createdBy: user?.name || 'Current User',
      createdAt: new Date(),
    },
    {
      id: 'task-2',
      title: 'Send property brochures',
      description: 'Email property details and brochures',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      priority: 'Medium',
      status: 'Completed',
      assignedTo: user?.name || 'Current User',
      createdBy: user?.name || 'Current User',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      completedAt: new Date(),
    },
  ]);

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'Medium' as Task['priority'],
  });

  const handleAddTask = () => {
    if (!newTask.title.trim() || !newTask.dueDate) return;

    const task: Task = {
      id: `task-${Date.now()}`,
      title: newTask.title,
      description: newTask.description,
      dueDate: new Date(newTask.dueDate),
      priority: newTask.priority,
      status: 'Pending',
      assignedTo: user?.name || 'Current User',
      createdBy: user?.name || 'Current User',
      createdAt: new Date(),
    };

    setTasks(prev => [task, ...prev]);
    setNewTask({
      title: '',
      description: '',
      dueDate: '',
      priority: 'Medium',
    });
    setShowAddTask(false);
  };

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
        return {
          ...task,
          status: newStatus,
          completedAt: newStatus === 'Completed' ? new Date() : undefined,
        };
      }
      return task;
    }));
  };

  const getPriorityColor = (priority: Task['priority']) => {
    const colors = {
      'High': 'bg-red-100 text-red-800 border-red-200',
      'Medium': 'bg-amber-100 text-amber-800 border-amber-200',
      'Low': 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[priority];
  };

  const getStatusColor = (status: Task['status']) => {
    const colors = {
      'Pending': 'bg-gray-100 text-gray-800 border-gray-200',
      'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
      'Completed': 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[status];
  };

  const isOverdue = (task: Task) => {
    return task.status !== 'Completed' && new Date(task.dueDate) < new Date();
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatDueDate = (date: Date) => {
    const now = new Date();
    const dueDate = new Date(date);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays > 0) return `Due in ${diffDays} days`;
    return `Overdue by ${Math.abs(diffDays)} days`;
  };

  const pendingTasks = tasks.filter(task => task.status !== 'Completed');
  const completedTasks = tasks.filter(task => task.status === 'Completed');
  const overdueTasks = tasks.filter(isOverdue);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            <span>Tasks & Follow-ups - {lead.name}</span>
          </DialogTitle>
          <DialogDescription>
            Manage tasks and follow-ups for this lead
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
                <div className="text-sm text-gray-600">Total Tasks</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{pendingTasks.length}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
                <div className="text-sm text-gray-600">Overdue</div>
              </CardContent>
            </Card>
          </div>

          {/* Add New Task */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Add New Task</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddTask(!showAddTask)}
                >
                  {showAddTask ? 'Cancel' : 'Add Task'}
                </Button>
              </div>
            </CardHeader>
            {showAddTask && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Task Title</Label>
                    <Input
                      placeholder="Enter task title..."
                      value={newTask.title}
                      onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input
                      type="datetime-local"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Task description..."
                    value={newTask.description}
                    onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select value={newTask.priority} onValueChange={(value: Task['priority']) => setNewTask(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleAddTask}
                  disabled={!newTask.title.trim() || !newTask.dueDate}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Tasks List */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">All Tasks</h3>
            
            {tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <Card key={task.id} className={`${task.status === 'Completed' ? 'opacity-75' : ''} ${isOverdue(task) ? 'border-red-200 bg-red-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <Checkbox
                            checked={task.status === 'Completed'}
                            onCheckedChange={() => handleToggleTask(task.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <h4 className={`font-medium ${task.status === 'Completed' ? 'line-through text-gray-500' : ''}`}>
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>{task.assignedTo}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(task.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-2">
                          <div className="flex items-center space-x-2">
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            <Badge className={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </div>
                          
                          <div className={`text-xs flex items-center space-x-1 ${isOverdue(task) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {isOverdue(task) && <AlertCircle className="h-3 w-3" />}
                            <Clock className="h-3 w-3" />
                            <span>{formatDueDate(task.dueDate)}</span>
                          </div>
                          
                          {task.completedAt && (
                            <div className="text-xs text-green-600">
                              Completed {formatDate(task.completedAt)}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No tasks created yet</p>
                <p className="text-sm mt-1">Add your first task to get started</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}