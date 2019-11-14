import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ResponceFileParamService } from '../responce-file-param.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModifyResponceFileParamComponent } from '../modify-responce-file-param/modify-responce-file-param.component';

@Component({
  selector: 'app-list-responce-file-param',
  templateUrl: './list-responce-file-param.component.html',
  styleUrls: ['./list-responce-file-param.component.scss']
})
export class ListResponceFileParamComponent implements OnInit {
  showResponceFileParam = false;
  responceFileParams: Observable<any[]>;

  constructor(private responceFileParamService: ResponceFileParamService, private modalService: NgbModal) { }

  ngOnInit() {
  }

  showResponceFileParams(enable: boolean) {
    this.showResponceFileParam = enable;

    if (enable) {
      this.responceFileParams = this.responceFileParamService.getResponceFileParams();
    }
  }

  addResponceFileParam() {
    const modalRef = this.modalService.open(ModifyResponceFileParamComponent);
    modalRef.componentInstance.param = {
      stage: 1,
      page: 1,
      template: ''
    };
    modalRef.result.then((result) => {
      console.log(result);
      this.responceFileParamService.createResponceFileParam(result).subscribe(data => {
        this.showResponceFileParams(true);
      }, err => {
        console.log(err);
        this.showResponceFileParams(true);
      });
    }).catch((error) => {
      console.log(error);
    });
  }
}
