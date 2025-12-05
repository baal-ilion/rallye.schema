import { Component, ElementRef, HostListener, Input, OnInit } from '@angular/core';
import { TeamInfo } from '../param/models/team-info';
import { TeamInfoService } from '../param/team-info.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  @Input() title: string;
  public collapsed = true;
  teamInfos: TeamInfo[] = [];
  openMenu: string | null = null;

  constructor(
    private teamInfoService: TeamInfoService,
    private elementRef: ElementRef<HTMLElement>
  ) { }

  ngOnInit() {
    this.teamInfoService.getTeamInfos().subscribe((value) => {
      const teamInfos = value._embedded.teamInfoes;
      teamInfos.sort((a, b) => (a.team > b.team) ? 1 : -1);
      this.teamInfos = teamInfos;
    }, (error) => {
      this.teamInfos = [];
    });
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
}
