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
  private serializeData(data: any): any {
    if (!data) {
      return undefined;
    }

    if (data instanceof Error) {
      return {
        name: data.name,
        message: data.message,
        stack: data.stack,
      };
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.serializeData(item));
    }

    if (typeof data === "object") {
      const serialized: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        serialized[key] = this.serializeData(value);
      }
      return serialized;
    }

    return data;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    let dataStr = "";

    if (data) {
      try {
        const normalized = this.serializeData(data);
        if (normalized !== undefined) {
          dataStr = ` ${JSON.stringify(normalized)}`;
        }
      } catch (err) {
        dataStr = ` ${JSON.stringify({
          serializationError:
            err instanceof Error ? err.message : String(err ?? "error"),
        })}`;
      }
    }

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
