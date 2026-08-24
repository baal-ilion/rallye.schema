import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-details-team-challenge',
  templateUrl: './details-team-challenge.component.html',
  styleUrls: ['./details-team-challenge.component.scss']
})
export class DetailsTeamChallengeComponent implements OnInit {
  challenge: number;
  team: number;
  contentZoomPercent = 100;
  hasSubmittedForms = false;

  private readonly ZoomId = 'details-team-challenge.zoom';

  constructor(
    private route: ActivatedRoute,
    private router: Router, ) { }

  ngOnInit(): void {
    this.contentZoomPercent = this.restoreZoom();
    this.route.params.subscribe(params => {
      this.team = params.team;
      this.challenge = params.challenge;
    }, error => {
      console.log(error);
      this.router.navigateByUrl('/');
    });
  }

  onLoadError(event: any) {
    console.log('Not found challenge detail');
    this.router.navigateByUrl('/');
  }

  zoomOut(): void {
    this.setZoom(Math.max(20, this.contentZoomPercent - 10));
  }

  zoomIn(): void {
    this.setZoom(Math.min(150, this.contentZoomPercent + 10));
  }

  resetZoom(): void {
    this.setZoom(100);
  }

  onSubmittedFormsVisibilityChange(visible: boolean): void {
    this.hasSubmittedForms = visible;
  }

  private setZoom(value: number): void {
    this.contentZoomPercent = value;
    localStorage.setItem(this.ZoomId, String(value));
  }

  private restoreZoom(): number {
    const storedValue = Number(localStorage.getItem(this.ZoomId));
    return Number.isFinite(storedValue) && storedValue >= 20 && storedValue <= 150
      ? storedValue
      : 100;
  }
}
