import { Component, OnInit, Input } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModifyResponseFileParamComponent } from '../modify-response-file-param/modify-response-file-param.component';
import { ResponseFileParamService } from '../response-file-param.service';

@Component({
  selector: 'app-details-response-file-param',
  templateUrl: './details-response-file-param.component.html',
  styleUrls: ['./details-response-file-param.component.scss']
})
export class DetailsResponseFileParamComponent implements OnInit {
  @Input() paramUrl: string;

  param: any;

  questions: { name: string, type: any }[];
  constructor(
    private responseFileParamService: ResponseFileParamService,
    private modalService: NgbModal) { }

  ngOnInit() {
    this.param = null;
    this.questions = [];
    console.log(this.paramUrl);
    this.responseFileParamService.getResponseFileParamByResource(this.paramUrl).subscribe((param) => {
      console.log(param);
      param.img = param._links.responseFileModel.href;
      this.param = param;
      this.loadQuestions(param.questions);
    });
  }

  loadQuestions(questions) {
    this.questions = [];
    const questionKeys = Object.keys(questions);
    for (const question of questionKeys) {
      if (questions[question].type !== 'QUESTION' && questions[question].type !== 'PERFORMANCE') {
        this.questions.push({ name: question, type: questions[question].type });
      }
    }
  }

  openModifyResponseFileParam() {
    const modalRef = this.modalService.open(ModifyResponseFileParamComponent);
    modalRef.componentInstance.param = this.param;
    modalRef.result.then((result) => {
      console.log(result);
      this.responseFileParamService.updateResponseFileParam(result).subscribe(data => {
        this.param = data;
        this.loadQuestions(this.param.questions);
      }, err => {
        console.log(err);
        this.loadQuestions(this.param.questions);
      });
    }).catch((error) => {
      console.log(error);
    });
  }
}
