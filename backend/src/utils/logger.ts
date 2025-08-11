/**
 * Logger utility for standardized logging across the application
 */

// Log levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
}

// Log entry interface
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: number | string;
  path?: string;
  method?: string;
  data?: any;
  error?: any;
}

/**
 * Application logger
 */
export class Logger {
  private context: string;
  
  constructor(context: string = 'app') {
    this.context = context;
  }
  
  /**
   * Log a message at the specified level
   * 
   * @param level Log level
   * @param message Log message
   * @param meta Additional metadata
   */
  private log(level: LogLevel, message: string, meta: Record<string, any> = {}) {
    const timestamp = new Date().toISOString();
    
    const entry: LogEntry = {
      timestamp,
      level,
      message,
      ...meta
    };
    
    // Format the log entry
    const formattedEntry = JSON.stringify({
      ...entry,
      context: this.context
    });
    
    // In production, we would use a proper logging service
    // For now, just log to console with appropriate method
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedEntry);
        break;
      case LogLevel.INFO:
        console.info(formattedEntry);
        break;
      case LogLevel.WARN:
        console.warn(formattedEntry);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedEntry);
        break;
    }
  }
  
  /**
   * Log a debug message
   * 
   * @param message Log message
   * @param meta Additional metadata
   */
  debug(message: string, meta: Record<string, any> = {}) {
    this.log(LogLevel.DEBUG, message, meta);
  }
  
  /**
   * Log an info message
   * 
   * @param message Log message
   * @param meta Additional metadata
   */
  info(message: string, meta: Record<string, any> = {}) {
    this.log(LogLevel.INFO, message, meta);
  }
  
  /**
   * Log a warning message
   * 
   * @param message Log message
   * @param meta Additional metadata
   */
  warn(message: string, meta: Record<string, any> = {}) {
    this.log(LogLevel.WARN, message, meta);
  }
  
  /**
   * Log an error message
   * 
   * @param message Log message
   * @param error Error object
   * @param meta Additional metadata
   */
  error(message: string, error?: any, meta: Record<string, any> = {}) {
    this.log(LogLevel.ERROR, message, {
      ...meta,
      error: formatError(error)
    });
  }
  
  /**
   * Log a fatal message
   * 
   * @param message Log message
   * @param error Error object
   * @param meta Additional metadata
   */
  fatal(message: string, error?: any, meta: Record<string, any> = {}) {
    this.log(LogLevel.FATAL, message, {
      ...meta,
      error: formatError(error)
    });
  }
  
  /**
   * Create a child logger with a specific context
   * 
   * @param context Context name
   * @returns New logger instance
   */
  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }
  
  /**
   * Create a request-specific logger
   * 
   * @param requestId Request ID
   * @param path Request path
   * @param method Request method
   * @returns New logger instance
   */
  forRequest(requestId: string, path: string, method: string): Logger {
    const childLogger = this.child('request');
    
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: LogLevel, message: string, meta: Record<string, any> = {}) => {
      originalLog(level, message, {
        ...meta,
        requestId,
        path,
        method
      });
    };
    
    return childLogger;
  }
}

/**
 * Format error object for logging
 * 
 * @param error Error object
 * @returns Formatted error
 */
function formatError(error: any): any {
  if (!error) return undefined;
  
  // Handle different error types
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error as any) // Include any custom properties
    };
  }
  
  // If it's already a plain object, return as is
  return error;
}

// Export a default logger instance
export default new Logger();