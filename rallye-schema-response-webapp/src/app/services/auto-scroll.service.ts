import { Injectable, OnDestroy } from '@angular/core';

interface AutoScrollOptions {
  step?: number;
  intervalMs?: number;
  pauseBottomMs?: number;
  pauseTopMs?: number;
}

/**
 * Provides a slow, repeated auto-scroll for public display screens.
 * Scrolls the target from top to bottom, waits briefly, then restarts at the top.
 */
@Injectable({
  providedIn: 'root'
})
export class AutoScrollService implements OnDestroy {
  private tickTimer: any = null;
  private resetTimer: any = null;
  private target: Window | HTMLElement = window;
  private running = false;
  private options: Required<AutoScrollOptions> = {
    step: 1,
    intervalMs: 40,
    pauseBottomMs: 5000,
    pauseTopMs: 5000
  };

  start(target: Window | HTMLElement = window, options?: AutoScrollOptions): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.options = {
      step: options?.step ?? 1,
      intervalMs: options?.intervalMs ?? 40,
      pauseBottomMs: options?.pauseBottomMs ?? 5000,
      pauseTopMs: options?.pauseTopMs ?? 5000
    };

    this.stop();
    this.target = this.resolveTarget(target);

    this.scrollToTop(true);
    this.running = true;
    this.runDownLoop();
  }

  stop(): void {
    this.running = false;
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  private resolveTarget(target: Window | HTMLElement): Window | HTMLElement {
    if (target instanceof HTMLElement) {
      // If element isn't scrollable, fallback to window.
      const maxScroll = Math.max(0, target.scrollHeight - target.clientHeight);
      return maxScroll > 0 ? target : window;
    }
    return window;
  }

  private getMaxScroll(target: Window | HTMLElement): number {
    if (target instanceof Window) {
      const docEl = document.documentElement || document.body;
      return Math.max(0, docEl.scrollHeight - target.innerHeight);
    }
    return Math.max(0, target.scrollHeight - target.clientHeight);
  }

  private getScrollTop(target: Window | HTMLElement): number {
    if (target instanceof Window) {
      return target.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    }
    return target.scrollTop;
  }

  private scrollToTop(immediate = false): void {
    const behavior: ScrollBehavior = immediate ? 'auto' : 'smooth';
    if (this.target instanceof Window) {
      this.target.scrollTo({ top: 0, behavior });
    } else {
      this.target.scrollTo({ top: 0, behavior });
    }
  }

  private scrollBy(step: number): void {
    if (this.target instanceof Window) {
      this.target.scrollBy({ top: step, behavior: 'auto' });
    } else {
      this.target.scrollBy({ top: step, behavior: 'auto' });
    }
  }

  private runDownLoop(): void {
    if (!this.running) {
      return;
    }

    const maxScroll = this.getMaxScroll(this.target);
    const current = this.getScrollTop(this.target);
    const nearBottom = current + this.options.step >= maxScroll;

    if (nearBottom) {
      this.tickTimer = null;
      this.scheduleResetCycle();
      return;
    }

    this.scrollBy(this.options.step);
    this.tickTimer = setTimeout(() => this.runDownLoop(), this.options.intervalMs);
  }

  private scheduleResetCycle(): void {
    if (!this.running) {
      return;
    }
    this.resetTimer = setTimeout(() => {
      this.scrollToTop(true); // jump up fast
      this.resetTimer = setTimeout(() => {
        this.resetTimer = null;
        this.runDownLoop();
      }, this.options.pauseTopMs);
    }, this.options.pauseBottomMs);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
