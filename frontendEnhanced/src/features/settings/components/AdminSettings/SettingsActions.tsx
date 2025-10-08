/**
 * Settings Actions Component
 * Save/Reset buttons for admin settings
 * Cognitive Complexity: 2
 */
import React from 'react';
import { Save, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '../../../../components/ui';

interface SettingsActionsProps {
  hasChanges: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}

export const SettingsActions: React.FC<SettingsActionsProps> = ({
  hasChanges,
  saving,
  onSave,
  onReset,
}) => {
  return (
    <div className="flex justify-end space-x-3 pt-4 border-t border-border-primary dark:border-dark-border-primary">
      <Button
        onClick={onReset}
        disabled={saving || !hasChanges}
        variant="outline"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Reset
      </Button>
      <Button
        onClick={onSave}
        disabled={saving || !hasChanges}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </>
        )}
      </Button>
    </div>
  );
};
