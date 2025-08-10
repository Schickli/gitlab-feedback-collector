export type LogContext = Record<string, unknown> | undefined;

function formatContext(context?: LogContext): string {
  if (!context) return "";
  try {
    return " " + JSON.stringify(context);
  } catch {
    return "";
  }
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(`[INFO] ${message}${formatContext(context)}`);
  },
  warn(message: string, context?: LogContext) {
    console.warn(`[WARN] ${message}${formatContext(context)}`);
  },
  error(message: string, context?: LogContext) {
    console.error(`[ERROR] ${message}${formatContext(context)}`);
  },
}; 