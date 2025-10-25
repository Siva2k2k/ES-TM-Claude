import React from 'react';
import { ProjectMembersSection } from './ProjectMembersSection';
import { ProjectTasksSection } from './ProjectTasksSection';
import type { ProjectMember } from '../../../hooks/useProjectMembers';
import type { Task } from '../../../types';

interface ProjectExpandedDetailsProps {
  projectId: string;
  members: ProjectMember[];
  tasks: Task[];
  onAddMember: () => void;
  onRemoveMember: (userId: string) => void;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

/**
 * ProjectExpandedDetails Component
 * Displays expanded project details with members and tasks
 *
 * Features:
 * - Members management section
 * - Tasks management section
 * - Consistent spacing and styling
 * - Animated appearance
 */
export const ProjectExpandedDetails: React.FC<ProjectExpandedDetailsProps> = ({
  projectId,
  members,
  tasks,
  onAddMember,
  onRemoveMember,
  onAddTask,
  onEditTask,
  onDeleteTask,
}) => {
  return (
    <div className="mt-6 pt-6 border-t border-gray-100 space-y-4 animate-fadeIn">
      {/* Members Section */}
      <ProjectMembersSection
        projectId={projectId}
        members={members}
        onAddMember={onAddMember}
        onRemoveMember={onRemoveMember}
      />

      {/* Tasks Section */}
      <ProjectTasksSection
        projectId={projectId}
        tasks={tasks}
        onAddTask={onAddTask}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
      />
    </div>
  );
};
