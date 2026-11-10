import { BudgetStatus, BudgetThresholdStatus } from './types';

export class BudgetExceededException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetExceededException';
  }
}

export class EmergencyPauseException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmergencyPauseException';
  }
}

export class BudgetGatekeeper {
  /**
   * Evaluates current monthly spend against search budget limits and returns status.
   */
  public static evaluateBudget(options: {
    monthlyLimitUsd: number;
    currentSpendUsd: number;
    isEmergencyPaused?: boolean;
  }): BudgetStatus {
    const { monthlyLimitUsd = 4.0, currentSpendUsd = 0.0, isEmergencyPaused = false } = options;

    const percentUsed = monthlyLimitUsd > 0 ? (currentSpendUsd / monthlyLimitUsd) * 100 : 100;

    let thresholdStatus: BudgetThresholdStatus = 'normal';
    let canExecuteHighPriority = true;
    let canExecuteLowPriority = true;

    if (isEmergencyPaused) {
      thresholdStatus = 'hard_stop';
      canExecuteHighPriority = false;
      canExecuteLowPriority = false;
    } else if (percentUsed >= 100) {
      thresholdStatus = 'hard_stop';
      canExecuteHighPriority = false;
      canExecuteLowPriority = false;
    } else if (percentUsed >= 90) {
      thresholdStatus = 'degraded';
      canExecuteHighPriority = true;
      canExecuteLowPriority = false; // Drop exploratory / low-priority queries
    } else if (percentUsed >= 70) {
      thresholdStatus = 'warning';
      canExecuteHighPriority = true;
      canExecuteLowPriority = true;
    }

    return {
      monthlyLimitUsd,
      currentSpendUsd,
      percentUsed: Number(percentUsed.toFixed(1)),
      thresholdStatus,
      isPaused: isEmergencyPaused || percentUsed >= 100,
      canExecuteHighPriority,
      canExecuteLowPriority,
    };
  }

  /**
   * Asserts whether a paid search query with given priority is permitted to execute.
   * Throws BudgetExceededException or EmergencyPauseException if blocked.
   */
  public static assertCanExecute(
    status: BudgetStatus,
    queryPriority: 'high' | 'normal' | 'low' = 'normal'
  ): void {
    if (status.isPaused) {
      throw new BudgetExceededException(
        `Search budget reached ($${status.currentSpendUsd.toFixed(2)} of $${status.monthlyLimitUsd.toFixed(2)} limit). Paid discovery is paused.`
      );
    }

    if (queryPriority === 'low' && !status.canExecuteLowPriority) {
      throw new BudgetExceededException(
        `Budget spend is at ${status.percentUsed}% (threshold >= 90%). Dropping low-priority exploratory queries.`
      );
    }
  }
}
