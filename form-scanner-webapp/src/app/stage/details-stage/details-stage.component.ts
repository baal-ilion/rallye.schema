import { Component, OnInit, Input } from '@angular/core';
import { UploadFileService } from 'src/app/upload/upload-file.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-details-stage',
  templateUrl: './details-stage.component.html',
  styleUrls: ['./details-stage.component.scss']
})
export class DetailsStageComponent implements OnInit {

  @Input() stage: any;

  results = [];
  files: Observable<any[]>;

  constructor(private uploadFileService: UploadFileService) { }

  ngOnInit() {
    this.results = [];
    for (const result of this.stage.results) {
      this.results.push({
        name: result.name,
        resultValue: result.resultValue
      });
    }
    this.files = this.uploadFileService.findByStageAndTeam(this.stage.stage, this.stage.team);
  }
}
