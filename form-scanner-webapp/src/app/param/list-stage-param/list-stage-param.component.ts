import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { StageParamService } from '../stage-param.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NewStageParamComponent } from '../new-stage-param/new-stage-param.component';

@Component({
  selector: 'app-list-stage-param',
  templateUrl: './list-stage-param.component.html',
  styleUrls: ['./list-stage-param.component.scss']
})
export class ListStageParamComponent implements OnInit {
  stageParams: any[] = [];

  constructor(
    private stageParamService: StageParamService,
    private modalService: NgbModal) { }

  ngOnInit() {
    this.stageParamService.getStageParams().subscribe((data) => {
      this.stageParams = data._embedded.stageParams;
    }, (error) => {
      this.stageParams = [];
    });
  }

  addStageParam() {
    const modalRef = this.modalService.open(NewStageParamComponent);
    modalRef.result.then((result) => {
      console.log(result);
      this.stageParamService.addStageParam(result).subscribe(data => {
        this.ngOnInit();
      }, err => {
        console.log(err);
        this.ngOnInit();
      });
    }).catch((error) => {
      console.log(error);
    });
  }
}
