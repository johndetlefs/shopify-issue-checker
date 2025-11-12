/**
 * Lightweight logging utility
 *
 * Provides structured logging with severity levels for the audit process.
 * Helps track progress and handle errors gracefully.
 */

export enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

class Logger {
  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : "";
    return `[${timestamp}] ${level}: ${message}${dataStr}`;
  }

  info(message: string, data?: any): void {
    console.log(this.formatMessage(LogLevel.INFO, message, data));
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, data));
  }

  error(message: string, error?: any): void {
    console.error(this.formatMessage(LogLevel.ERROR, message, error));
    if (error?.stack) {
      console.error(error.stack);
    }
  }
}

export const logger = new Logger();
