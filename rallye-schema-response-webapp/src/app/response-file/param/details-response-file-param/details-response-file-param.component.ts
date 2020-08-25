import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { QuestionType } from 'src/app/param/models/question-type';
import { QuestionPageParam } from '../models/question-page-param';
import { ResponseFileParam } from '../models/response-file-param';
import { ModifyResponseFileParamComponent } from '../modify-response-file-param/modify-response-file-param.component';
import { ResponseFileParamService } from '../response-file-param.service';

@Component({
  selector: 'app-details-response-file-param',
  templateUrl: './details-response-file-param.component.html',
  styleUrls: ['./details-response-file-param.component.scss']
})
export class DetailsResponseFileParamComponent implements OnInit {
  @Input() paramUrl: string;
  @Output() deleteEvent = new EventEmitter();

  param: ResponseFileParam;
  modelUrl: string;

  questions: QuestionPageParam[];
  constructor(
    private responseFileParamService: ResponseFileParamService,
    private modalService: NgbModal,
    private confirmationDialogService: ConfirmationDialogService
  ) { }

  ngOnInit() {
    this.param = null;
    this.questions = [];
    console.log(this.paramUrl);
    this.responseFileParamService.getResponseFileParamByResource(this.paramUrl).subscribe((param) => {
      console.log(param);
      this.param = param;
      this.modelUrl = param._links.responseFileModel.href;
      this.loadQuestions(param.questions);
    });
  }

  loadQuestions(questions: { [x: string]: QuestionPageParam }) {
    this.questions = [];
    for (const question of Object.values(questions)) {
      if (question.type !== QuestionType.QUESTION && question.type !== QuestionType.PERFORMANCE) {
        this.questions.push(question);
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

  deleteResponseFileParam() {
    this.confirmationDialogService.confirm(
      'Suppresion d\'une page de formulaire de réponses',
      'Supprimer la page n°' + this.param.page + ' du formulaire de réponses de l\'épreuve ' + this.param.stage + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          this.responseFileParamService.deleteResponseFileParam(this.param.id).subscribe(() => {
            console.log('Deleted:', this.param.id);
            this.deleteEvent.emit({ id: this.param.id });
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }
}
