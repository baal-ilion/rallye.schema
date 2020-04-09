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

  constructor(
    private route: ActivatedRoute,
    private router: Router, ) { }

  ngOnInit(): void {
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
}
