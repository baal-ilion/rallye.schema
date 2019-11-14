import { Component, OnInit, Input } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModifyResponceFileParamComponent } from '../modify-responce-file-param/modify-responce-file-param.component';
import { ResponceFileParamService } from '../responce-file-param.service';

@Component({
  selector: 'app-details-responce-file-param',
  templateUrl: './details-responce-file-param.component.html',
  styleUrls: ['./details-responce-file-param.component.scss']
})
export class DetailsResponceFileParamComponent implements OnInit {
  @Input() param: any;

  constructor(private responceFileParamService: ResponceFileParamService, private modalService: NgbModal) { }

  ngOnInit() {
    this.param.img = 'http://localhost:8080/downloadResponceFile/5dbec6971e2d1d78a85ce97b';
  }

  openModifyResponceFileParam() {
    const modalRef = this.modalService.open(ModifyResponceFileParamComponent);
    modalRef.componentInstance.param = this.param;
    modalRef.result.then((result) => {
      console.log(result);
      this.responceFileParamService.updateResponceFileParam({
        id: this.param.id,
        stage: result.stage,
        page: result.page,
        template: result.template
      }).subscribe(data => {
        this.param = data;
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
