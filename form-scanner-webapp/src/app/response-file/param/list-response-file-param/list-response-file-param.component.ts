import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ResponseFileParamService } from '../response-file-param.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModifyResponseFileParamComponent } from '../modify-response-file-param/modify-response-file-param.component';

@Component({
  selector: 'app-list-response-file-param',
  templateUrl: './list-response-file-param.component.html',
  styleUrls: ['./list-response-file-param.component.scss']
})
export class ListResponseFileParamComponent implements OnInit {
  responseFileParams: Observable<any[]>;

  constructor(private responseFileParamService: ResponseFileParamService, private modalService: NgbModal) { }

  ngOnInit() {
    this.responseFileParams = this.responseFileParamService.getResponseFileParams();
  }

  addResponseFileParam() {
    const modalRef = this.modalService.open(ModifyResponseFileParamComponent);
    modalRef.componentInstance.param = {
      stage: 1,
      page: 1,
      template: ''
    };
    modalRef.result.then((result) => {
      console.log(result);
      this.responseFileParamService.createResponseFileParam(result).subscribe(data => {
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
