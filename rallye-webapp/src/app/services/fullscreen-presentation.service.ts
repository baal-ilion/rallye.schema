import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FullscreenPresentationService {
  async enter(element: HTMLElement): Promise<void> {
    if (document.fullscreenElement === element) {
      return;
    }
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    await element.requestFullscreen();
  }

  async exit(): Promise<void> {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  }

  isActiveFor(element?: HTMLElement): boolean {
    return !!element && document.fullscreenElement === element;
  }
}
