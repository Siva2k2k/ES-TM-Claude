import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Switch } from './ui/Switch';
import { Label } from './ui/Label';
import { User, UserRole } from '../types';
import { userService } from '../services/userService';
import { toast } from '../hooks/useToast';

const userFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['User', 'Admin', 'SuperAdmin']),
  isActive: z.boolean(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: User | null;
  onSave: () => void;
  onCancel: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ user, onSave, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!user;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: user?.email || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      role: user?.role || 'User',
      isActive: user ? (user as any).isActive || true : true,
      password: '',
      confirmPassword: '',
    },
  });

  const isActive = watch('isActive');

  useEffect(() => {
    if (user) {
      setValue('email', user.email);
      setValue('firstName', user.firstName);
      setValue('lastName', user.lastName);
      setValue('role', user.role);
      setValue('isActive', (user as any).isActive || true);
    }
  }, [user, setValue]);

  const onSubmit = async (data: UserFormData) => {
    try {
      setIsSubmitting(true);

      const userData = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        isActive: data.isActive,
        ...(data.password && { password: data.password }),
      };

      if (isEditing && user) {
        await userService.updateUser(user.id, userData);
        toast.success('User updated successfully');
      } else {
        if (!data.password) {
          toast.error('Password is required for new users');
          return;
        }
        await userService.createUser({ ...userData, password: data.password });
        toast.success('User created successfully');
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving user:', error);
      
      let message = 'Failed to save user';
      if (error?.message?.includes('not yet implemented')) {
        message = 'User management functionality not yet implemented in backend';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          {isEditing ? 'Edit User' : 'Create New User'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isEditing ? 'Update user information' : 'Add a new user to the system'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              {...register('firstName')}
              error={errors.firstName?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              {...register('lastName')}
              error={errors.lastName?.message}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select
            {...register('role')}
            error={errors.role?.message}
          >
            <option value="User">User</option>
            <option value="Admin">Admin</option>
            <option value="SuperAdmin">Super Admin</option>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={(checked) => setValue('isActive', checked)}
          />
          <Label htmlFor="isActive">Active User</Label>
        </div>

        {!isEditing && (
          <>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                error={errors.password?.message}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                error={errors.confirmPassword?.message}
              />
            </div>
          </>
        )}

        {isEditing && (
          <div className="space-y-2">
            <Label htmlFor="password">New Password (optional)</Label>
            <Input
              id="password"
              type="password"
              placeholder="Leave blank to keep current password"
              {...register('password')}
              error={errors.password?.message}
            />
            {watch('password') && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  error={errors.confirmPassword?.message}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;