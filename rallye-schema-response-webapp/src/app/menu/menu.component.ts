import { Component, ElementRef, HostListener, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationMemoryService } from '../services/navigation-memory.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  @Input() title: string;
  public collapsed = true;
  openMenu: string | null = null;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private router: Router,
    private navigationMemoryService: NavigationMemoryService
  ) { }

  ngOnInit() {
  }

  toggleMenu(menu: string) {
    this.openMenu = this.openMenu === menu ? null : menu;
  }

  closeMenu() {
    this.openMenu = null;
    this.collapsed = true;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as Node;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.closeMenu();
    }
  }

  rememberUrl(event?: Event, url?: string) {
    const target = url || this.extractHref(event) || this.router.url;
    this.navigationMemoryService.setLastMenuUrl(target);
    this.closeMenu();
  }

  private extractHref(event?: Event): string | undefined {
    const anchor = event?.currentTarget as HTMLAnchorElement | null;
    if (anchor?.href) {
      try {
        const parsed = new URL(anchor.href);
        return parsed.pathname + parsed.search + parsed.hash;
      } catch {
        return anchor.getAttribute('href') || undefined;
      }
    }
    return undefined;
  }
}
