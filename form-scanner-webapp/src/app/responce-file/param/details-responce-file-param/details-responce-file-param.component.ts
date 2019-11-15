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

  questions: { name: string, type: any }[];
  constructor(private responceFileParamService: ResponceFileParamService, private modalService: NgbModal) { }

  ngOnInit() {
    console.log(this.param);
    this.param.img = 'http://localhost:8080/responceFileModel/' + this.param.id;
    this.loadQuestions(this.param.questions);
  }

  loadQuestions(questions) {
    this.questions = [];
    const questionKeys = Object.keys(questions);
    for (const question of questionKeys) {
      this.questions.push({ name: question, type: questions[question].type });
    }
  }

  openModifyResponceFileParam() {
    const modalRef = this.modalService.open(ModifyResponceFileParamComponent);
    modalRef.componentInstance.param = this.param;
    modalRef.result.then((result) => {
      console.log(result);
      this.responceFileParamService.updateResponceFileParam(result).subscribe(data => {
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
