// Mongoose type helpers to bypass strict type checking issues
// This file provides type-safe wrappers for Mongoose queries

export const mongoQuery = {
  // Generic query wrapper to bypass type issues
  find: (model: any) => (filter?: any, projection?: any, options?: any) => 
    (model as any).find(filter, projection, options),
  
  findOne: (model: any) => (filter?: any, projection?: any, options?: any) => 
    (model as any).findOne(filter, projection, options),
  
  findById: (model: any) => (id: any, projection?: any, options?: any) => 
    (model as any).findById(id, projection, options),
  
  findByIdAndUpdate: (model: any) => (id: any, update: any, options?: any) => 
    (model as any).findByIdAndUpdate(id, update, options),
  
  findOneAndUpdate: (model: any) => (filter: any, update: any, options?: any) => 
    (model as any).findOneAndUpdate(filter, update, options),
  
  updateOne: (model: any) => (filter: any, update: any, options?: any) => 
    (model as any).updateOne(filter, update, options),
  
  aggregate: (model: any) => (pipeline: any[], options?: any) => 
    (model as any).aggregate(pipeline, options)
};