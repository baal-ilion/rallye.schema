import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, SimpleChange } from '@angular/core';
import { FormTemplate } from './models/form-template';
import { CdkDragEnd } from '@angular/cdk/drag-drop';
import { Corners } from './models/corners';

@Component({
  selector: 'app-details-template',
  templateUrl: './details-template.component.html',
  styleUrls: ['./details-template.component.scss']
})
export class DetailsTemplateComponent implements OnInit, OnChanges {
  @Input() template: FormTemplate;
  @Input() dragable = true;
  @Output() endDragEvent = new EventEmitter<Corners>();

  points = [];
  topLeftCorner: any;
  bottomLeftCorner: any;
  bottomRightCorner: any;
  topRightCorner: any;

  constructor() { }

  ngOnInit() {
    this.loadTemplate(this.template);
  }

  ngOnChanges(changes: SimpleChanges): void {
    for (const propName in changes) {
      if (propName === 'template') {
        const change = changes[propName];
        this.loadTemplate(change.currentValue);
        break;
      }
    }
  }

  loadTemplate(template: FormTemplate) {
    const height = template.height;
    const width = template.width;
    const initialHeight = template.initialHeight && template.initialHeight !== 0 ? template.initialHeight : template.height;
    const initialWidth = template.initialWidth && template.initialWidth !== 0 ? template.initialWidth : template.width;
    const transform = width / initialWidth;
    const squareHeight = template.square * 2 * 100 * transform / height;
    const squareWidth = template.square * 2 * 100 * transform / width;

    this.topLeftCorner = {
      top: template.corners.TOP_LEFT.y * 100 / height,
      left: template.corners.TOP_LEFT.x * 100 / width,
      width: squareWidth, height: squareHeight
    };
    this.bottomLeftCorner = {
      top: template.corners.BOTTOM_LEFT.y * 100 / height,
      left: template.corners.BOTTOM_LEFT.x * 100 / width,
      width: squareWidth, height: squareHeight
    };
    this.bottomRightCorner = {
      top: template.corners.BOTTOM_RIGHT.y * 100 / height,
      left: template.corners.BOTTOM_RIGHT.x * 100 / width,
      width: squareWidth, height: squareHeight
    };
    this.topRightCorner = {
      top: template.corners.TOP_RIGHT.y * 100 / height,
      left: template.corners.TOP_RIGHT.x * 100 / width,
      width: squareWidth, height: squareHeight
    };


    this.points = [];
    for (const point of template.points) {
      let pointClass = 'default-point';
      if (point.valid === true) {
        pointClass = 'valid-point';
      } else if (point.valid === false) {
        pointClass = 'invalid-point';
      }
      this.points.push({
        top: point.point.y * 100 / height,
        left: point.point.x * 100 / width,
        width: squareWidth, height: squareHeight,
        class: pointClass,
        tooltip: point.comment
      });
    }
  }

  endDrag(event: CdkDragEnd, corner: any) {
    const pos = event.source.getFreeDragPosition();
    const top = pos.y * 100 / event.source.element.nativeElement.parentElement.offsetHeight;
    const left = pos.x * 100 / event.source.element.nativeElement.parentElement.offsetWidth;
    corner.top += top;
    corner.left += left;
    event.source.reset();


    const height = this.template.height;
    const width = this.template.width;
    this.endDragEvent.emit({
      TOP_LEFT: {
        x: width * this.topLeftCorner.left / 100,
        y: height * this.topLeftCorner.top / 100
      },
      BOTTOM_LEFT: {
        x: width * this.bottomLeftCorner.left / 100,
        y: height * this.bottomLeftCorner.top / 100
      },
      BOTTOM_RIGHT: {
        x: width * this.bottomRightCorner.left / 100,
        y: height * this.bottomRightCorner.top / 100
      },
      TOP_RIGHT: {
        x: width * this.topRightCorner.left / 100,
        y: height * this.topRightCorner.top / 100
      }
    });
  }
}
