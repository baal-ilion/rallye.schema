import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-details-team-stage',
  templateUrl: './details-team-stage.component.html',
  styleUrls: ['./details-team-stage.component.scss']
})
export class DetailsTeamStageComponent implements OnInit {
  stage: number;
  team: number;
  contentZoomPercent = 100;
  hasResponseFiles = false;

  private readonly ZoomId = 'details-team-stage.zoom';

  constructor(
    private route: ActivatedRoute,
    private router: Router, ) { }

  ngOnInit(): void {
    this.contentZoomPercent = this.restoreZoom();
    this.route.params.subscribe(params => {
      this.team = params.team;
      this.stage = params.stage;
    }, error => {
      console.log(error);
      this.router.navigateByUrl('/');
    });
  }

  onLoadError(event: any) {
    console.log('Not found stage detail');
    this.router.navigateByUrl('/');
  }

  zoomOut(): void {
    this.setZoom(Math.max(50, this.contentZoomPercent - 10));
  }

  zoomIn(): void {
    this.setZoom(Math.min(150, this.contentZoomPercent + 10));
  }

  resetZoom(): void {
    this.setZoom(100);
  }

  onResponseFilesVisibilityChange(visible: boolean): void {
    this.hasResponseFiles = visible;
  }

  private setZoom(value: number): void {
    this.contentZoomPercent = value;
    localStorage.setItem(this.ZoomId, String(value));
  }

  private restoreZoom(): number {
    const storedValue = Number(localStorage.getItem(this.ZoomId));
    return Number.isFinite(storedValue) && storedValue >= 50 && storedValue <= 150
      ? storedValue
      : 100;
  }
}
