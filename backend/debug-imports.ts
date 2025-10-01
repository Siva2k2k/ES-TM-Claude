// Temporary test to debug route issue
import {
  ProjectController,
  updateTaskValidation,
  taskIdValidation,
} from '@/controllers/ProjectController';

console.log('ProjectController:', typeof ProjectController);
console.log('ProjectController.updateTask:', typeof ProjectController.updateTask);
console.log('taskIdValidation:', typeof taskIdValidation);
console.log('updateTaskValidation:', typeof updateTaskValidation);