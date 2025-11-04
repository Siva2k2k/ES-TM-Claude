import mongoose, { Schema, Document, Types, Model } from 'mongoose';

export interface IUserVoicePreferences extends Document {
  user_id: Types.ObjectId;
  speechMethod: 'web-speech' | 'azure-speech' | 'auto';
  enabledIntents: string[];
  disabledIntents: string[];
  customCommands: Array<{
    phrase: string;
    intent: string;
    data: Record<string, any>;
  }>;
  voiceSettings: {
    language: string;
    autoSubmit: boolean;
    confirmBeforeExecute: boolean;
  };
  commandHistory: Array<{
    command: string;
    intent: string;
    timestamp: Date;
    success: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const UserVoicePreferencesSchema = new Schema<IUserVoicePreferences>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    speechMethod: {
      type: String,
      enum: ['web-speech', 'azure-speech', 'auto'],
      default: 'auto'
    },
    enabledIntents: [{
      type: String,
      trim: true
    }],
    disabledIntents: [{
      type: String,
      trim: true
    }],
    customCommands: [{
      phrase: {
        type: String,
        required: true,
        trim: true
      },
      intent: {
        type: String,
        required: true,
        trim: true
      },
      data: {
        type: Schema.Types.Mixed,
        default: {}
      }
    }],
    voiceSettings: {
      language: {
        type: String,
        default: 'en-US'
      },
      autoSubmit: {
        type: Boolean,
        default: false
      },
      confirmBeforeExecute: {
        type: Boolean,
        default: true
      }
    },
    commandHistory: [{
      command: {
        type: String,
        required: true
      },
      intent: {
        type: String,
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      success: {
        type: Boolean,
        required: true
      }
    }]
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Limit command history to last 50 entries
UserVoicePreferencesSchema.pre('save', function (next) {
  if (this.commandHistory && this.commandHistory.length > 50) {
    this.commandHistory = this.commandHistory.slice(-50);
  }
  next();
});

// Virtual ID
UserVoicePreferencesSchema.virtual('id').get(function (this: any) {
  return this._id?.toHexString();
});

// Prevent model overwrite error in development
const UserVoicePreferences: Model<IUserVoicePreferences> = mongoose.models.UserVoicePreferences ||
  mongoose.model<IUserVoicePreferences>(
    'UserVoicePreferences',
    UserVoicePreferencesSchema
  );

export default UserVoicePreferences;
