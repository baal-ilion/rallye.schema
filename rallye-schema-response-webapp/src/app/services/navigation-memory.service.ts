import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NavigationMemoryService {
  private readonly storageKey = 'navigation.lastMenuUrl';

  setLastMenuUrl(url: string): void {
    if (!url) {
      return;
    }
    sessionStorage.setItem(this.storageKey, url);
  }

  getLastMenuUrl(): string | null {
    return sessionStorage.getItem(this.storageKey);
  }
}
