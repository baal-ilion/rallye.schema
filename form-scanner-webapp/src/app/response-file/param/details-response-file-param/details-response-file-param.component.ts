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
  @Input() param: any;

  questions: { name: string, type: any }[];
  constructor(private responseFileParamService: ResponseFileParamService, private modalService: NgbModal) { }

  ngOnInit() {
    console.log(this.param);
    this.param.img = 'http://localhost:8080/responseFileModel/' + this.param.id;
    this.loadQuestions(this.param.questions);
  }

  loadQuestions(questions) {
    this.questions = [];
    const questionKeys = Object.keys(questions);
    for (const question of questionKeys) {
      this.questions.push({ name: question, type: questions[question].type });
    }
  }

  openModifyResponseFileParam() {
    const modalRef = this.modalService.open(ModifyResponseFileParamComponent);
    modalRef.componentInstance.param = this.param;
    modalRef.result.then((result) => {
      console.log(result);
      this.responseFileParamService.updateResponseFileParam(result).subscribe(data => {
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
