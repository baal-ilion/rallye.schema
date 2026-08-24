import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { auditTime, filter, takeUntil } from 'rxjs/operators';
import { ApplicationUpdateService } from 'src/app/services/application-update.service';
import { AbstractControl, UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { HalLink } from 'src/app/models/hal-link';
import { ModifyFormRecognitionConfigurationComponent } from 'src/app/form-recognition/configuration/modify-form-recognition-configuration/modify-form-recognition-configuration.component';
import { FormRecognitionConfiguration } from 'src/app/form-recognition/configuration/models/form-recognition-configuration';
import { FormRecognitionConfigurationService } from 'src/app/form-recognition/configuration/form-recognition-configuration.service';
import { AppDialogRef, DialogService } from 'src/app/shared/dialog/dialog.service';
import { ChallengeGroupService } from 'src/app/services/challenge-group.service';
import { ModifyPerformanceScoringRangeComponent } from '../modify-performance-scoring-range/modify-performance-scoring-range.component';
import { PerformanceScoringRange } from '../models/performance-scoring-range';
import { PerformanceRangeType } from '../models/performance-range-type';
import { QuestionDefinition } from '../models/question-definition';
import { QuestionScoring } from '../models/question-scoring';
import { QuestionType } from '../models/question-type';
import { PerformanceScorings, QuestionDefinitions, QuestionScorings, ChallengeConfiguration } from '../models/challenge-configuration';
import { ChallengeGroup } from '../models/challenge-group';
import { ChallengeConfigurationService } from '../challenge-configuration.service';

type PerfPointAllocation = 'SCORE' | 'DATE' | 'RANK';
type PartialQuestionDefinition = { name: string; type?: QuestionType };

@Component({
  selector: 'app-modify-challenge-configuration',
  templateUrl: './modify-challenge-configuration.component.html',
  styleUrls: ['./modify-challenge-configuration.component.scss']
})
export class ModifyChallengeConfigurationComponent implements OnInit, OnDestroy {
  challengeConfiguration!: ChallengeConfiguration;
  challengeConfigurations: ChallengeConfiguration[] = [];
  challengeGroups: ChallengeGroup[] = [];

  perfPointAllocationType: Record<PerformanceRangeType, PerfPointAllocation> = {
    VALUE: 'SCORE',
    BEGIN_UP_RANK: 'DATE',
    BEGIN_DOWN_RANK: 'DATE',
    END_UP_RANK: 'DATE',
    END_DOWN_RANK: 'DATE',
    PERF_UP_RANK: 'RANK',
    PERF_DOWN_RANK: 'RANK'
  };

  perfPointDefaultRangeType: Record<PerfPointAllocation, PerformanceRangeType> = {
    SCORE: PerformanceRangeType.VALUE,
    DATE: PerformanceRangeType.BEGIN_UP_RANK,
    RANK: PerformanceRangeType.PERF_UP_RANK,
  };

  challengeConfigurationForm!: UntypedFormGroup;
  formRecognitionConfigurationUrls: string[] = [];
  removedQuestionDefinitions: string[] = [];
  questionDefinitionNames: string[] = [];
  questionDefinitionName = '';
  questionDefinitionError = '';
  showSubmittedForms = false;
  showQuestions = false;
  showPoints = false;
  private questionPointLabelWidthCache = new Map<string, string>();
  private destroy$ = new Subject<void>();
  private synchronizationInitialized = false;

  get formDesignerUrl(): string {
    const challengeId = this.challengeConfiguration?.id ? `?challengeId=${encodeURIComponent(this.challengeConfiguration.id)}` : '';
    return `https://${window.location.hostname}:4300/${challengeId}`;
  }

  constructor(
    private formBuilder: UntypedFormBuilder,
    private challengeConfigurationService: ChallengeConfigurationService,
    private route: ActivatedRoute,
    private confirmationDialogService: ConfirmationDialogService,
    private router: Router,
    private dialogService: DialogService,
    private formRecognitionConfigurationService: FormRecognitionConfigurationService,
    private challengeGroupService: ChallengeGroupService,
    private applicationUpdates: ApplicationUpdateService
  ) { }

  // convenience getters for easy access to form fields
  get f() { return this.challengeConfigurationForm.controls; }
  get questionScorings() { return this.f.questionScorings as UntypedFormArray; }
  get performanceScorings() { return this.f.performanceScorings as UntypedFormArray; }
  get questionDefinitions() { return this.f.questionDefinitions as UntypedFormArray; }
  getQuestionPointLabelWidth(): string {
    return this.getControlsLabelWidth(this.questionScorings);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  getQuestionDefinitionLabelWidth(): string {
    return this.getControlsLabelWidth(this.questionDefinitions);
  }
  private getControlsLabelWidth(controls: UntypedFormArray): string {
    const labels = controls.controls.map(control => String(control.get('name')?.value ?? '').trim());
    const cacheKey = labels.join('\u0000');
    const cachedWidth = this.questionPointLabelWidthCache.get(cacheKey);
    if (cachedWidth) {
      return cachedWidth;
    }
    const context = document.createElement('canvas').getContext('2d');
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const fontFamily = getComputedStyle(document.body).fontFamily || 'Arial, sans-serif';
    if (context) {
      context.font = `600 ${rootFontSize * .72}px ${fontFamily}`;
    }
    const measuredWidth = labels.reduce((width, label) =>
      Math.max(width, context?.measureText(label).width ?? label.length * rootFontSize * .45), 0);
    const width = `${Math.max(32, Math.ceil(measuredWidth) + 4)}px`;
    this.questionPointLabelWidthCache.set(cacheKey, width);
    return width;
  }
  getRanges(performanceScoring: AbstractControl) {
    const f = (performanceScoring as UntypedFormGroup).controls;
    return f.ranges as UntypedFormArray;
  }

  ngOnInit() {
    if (!this.synchronizationInitialized) {
      this.synchronizationInitialized = true;
      this.applicationUpdates.updates$.pipe(
        filter(update => update.domain === 'CONFIGURATION' || update.domain === 'DATABASE'),
        auditTime(150), takeUntil(this.destroy$)
      ).subscribe(() => {
        if (!this.challengeConfigurationForm?.dirty && !this.dialogService.hasOpenDialogs()) this.ngOnInit();
      });
    }
    this.questionDefinitionName = '';
    this.questionDefinitionError = '';
    this.removedQuestionDefinitions = [];
    this.questionDefinitionNames = [];
    this.formRecognitionConfigurationUrls = [];

    // Formulaire réactif : on ajoute groupId
    this.challengeConfigurationForm = this.formBuilder.group({
      challenge: [null, [Validators.required, Validators.min(1), this.uniqueChallengeValidator.bind(this)]],
      name: '',
      groupId: '', // id du groupe ou '' si aucun
      questionScorings: this.formBuilder.array([]),
      performanceScorings: this.formBuilder.array([]),
      questionDefinitions: this.formBuilder.array([])
    });

    // Charger les épreuves existantes pour la vérification d'unicité du numéro
    this.challengeConfigurationService.getChallengeConfigurations().subscribe({
      next: response => {
        this.challengeConfigurations = response?._embedded?.challengeConfigurations ?? [];
        this.challengeConfigurationForm.controls.challenge.updateValueAndValidity();
      },
      error: () => {
        this.challengeConfigurations = [];
      }
    });

    // Charger les groupes d'épreuves pour le <select>
    this.challengeGroupService.getAll().subscribe({
      next: groups => this.challengeGroups = groups,
      error: () => this.challengeGroups = []
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigateByUrl('/challenges/validationConfiguration');
      return;
    }
    this.challengeConfigurationService.findById(id).subscribe(challengeConfiguration => {
      this.challengeConfiguration = challengeConfiguration;
      this.questionDefinitionName = '';
      this.removedQuestionDefinitions = [];
      this.questionDefinitionNames = [];
      this.challengeConfigurationForm.controls.challenge.setValue(this.challengeConfiguration.challenge);
      this.challengeConfigurationForm.controls.name.setValue(this.challengeConfiguration.name);

      // Pré-remplir groupId avec le groupe existant (ou '')
      const currentGroupId = this.challengeConfiguration.group && this.challengeConfiguration.group.id ? this.challengeConfiguration.group.id : '';
      this.challengeConfigurationForm.controls.groupId.setValue(currentGroupId);
      this.challengeConfigurationForm.controls.challenge.updateValueAndValidity();

      this.questionScorings.clear();
      this.performanceScorings.clear();
      this.questionDefinitions.clear();

      const questionKeys = Object.keys(this.challengeConfiguration.questionDefinitions)
        .sort((left, right) => this.compareLabels(left, right));
      for (const questionKey of questionKeys) {
        const questionDefinition = this.challengeConfiguration.questionDefinitions[questionKey];
        this.initQuestionScoring(questionDefinition);
        this.initQuestionDefinition(questionDefinition);
      }
      if (this.challengeConfiguration._links && this.challengeConfiguration._links.formRecognitionConfigurations) {
        for (const formRecognitionConfigurationUrl of this.challengeConfiguration._links.formRecognitionConfigurations as HalLink[]) {
          this.formRecognitionConfigurationUrls.push(formRecognitionConfigurationUrl.href);
        }
      }
    }, error => {
      this.questionDefinitionName = '';
      this.removedQuestionDefinitions = [];
      this.questionDefinitionNames = [];
      this.formRecognitionConfigurationUrls = [];
      this.challengeConfigurationForm.controls.challenge.setValue('');
      this.challengeConfigurationForm.controls.name.setValue('');
      this.challengeConfigurationForm.controls.groupId.setValue('');
      this.questionScorings.clear();
      this.performanceScorings.clear();
      this.questionDefinitions.clear();
      console.log(error);
      this.router.navigateByUrl('/challenges/validationConfiguration');
    });
  }

  private initQuestionScoring(questionDefinition: QuestionDefinition) {
    if (questionDefinition.type === QuestionType.QUESTION) {
      let pointValue = 0;
      const questionPoint = this.challengeConfiguration.questionScorings[questionDefinition.name];
      if (questionPoint && questionPoint.point) {
        pointValue = questionPoint.point;
      }
      this.questionScorings.push(this.formBuilder.group({
        name: questionDefinition.name,
        point: pointValue
      }));
    } else if (questionDefinition.type === QuestionType.PERFORMANCE) {
      const performancePoint = this.challengeConfiguration.performanceScorings[questionDefinition.name];
      const ranges = this.formBuilder.array([]);
      if (performancePoint?.ranges)
        performancePoint.ranges.forEach(range => ranges.push(this.buildFormGroup(range)));
      ranges.push(this.buildFormGroup({} as PerformanceScoringRange));
      this.performanceScorings.push(this.formBuilder.group({
        name: questionDefinition.name,
        ranges
      }));
    }
  }

  private buildFormGroup(range: PerformanceScoringRange): UntypedFormGroup {
    return this.formBuilder.group({
      allocationType: range.type ? this.perfPointAllocationType[range.type] : null,
      type: range.type,
      begin: range.begin,
      end: range.end,
      point: range.point,
      expression: range.expression
    });
  }

  private initQuestionDefinition(questionDefinition: QuestionDefinition) {
    if (questionDefinition.type === QuestionType.QUESTION || questionDefinition.type === QuestionType.PERFORMANCE) {
      this.questionDefinitions.push(this.formBuilder.group({
        name: questionDefinition.name,
        type: questionDefinition.type
      }));
      this.questionDefinitionNames.push(questionDefinition.name);
    }
  }

  addFormRecognitionConfiguration() {
    const initialConfiguration = {
      challenge: this.challengeConfiguration.challenge,
      page: 1,
      template: '',
      height: 0,
      width: 0,
      questions: {} as any
    } as FormRecognitionConfiguration;
    const modalRef: AppDialogRef<ModifyFormRecognitionConfigurationComponent, FormData> = this.dialogService.open(ModifyFormRecognitionConfigurationComponent, {
      data: {
        challengeName: this.challengeConfiguration.name,
        configuration: initialConfiguration
      }
    });
    modalRef.result.then((result) => {
      console.log(result);
      if (!result) { return; }
      this.formRecognitionConfigurationService.createFormRecognitionConfiguration(result as FormData).subscribe(() => {
        this.ngOnInit();
      }, err => {
        console.log(err);
        this.ngOnInit();
      });
    }).catch((error) => {
      console.log(error);
    });
  }

  addQuestionDefinition(questionName: string) {
    const name = (questionName || '').trim();
    this.questionDefinitionError = '';
    if (!name) {
      this.questionDefinitionError = 'Le label de la question est obligatoire.';
      return;
    }
    const existingName = this.questionDefinitionNames.find(item =>
      this.compareLabels(item, name) === 0 && !this.removedQuestionDefinitions.includes(item));
    if (existingName) {
      this.questionDefinitionError = `La question « ${existingName} » existe déjà.`;
      return;
    }

    const question = this.formBuilder.group({ name, type: QuestionType.QUESTION });
    const questionInsertionIndex = this.questionDefinitions.controls.findIndex(control =>
      this.compareLabels(name, control.value.name) < 0);
    this.questionDefinitions.insert(
      questionInsertionIndex < 0 ? this.questionDefinitions.length : questionInsertionIndex, question);

    const point = this.formBuilder.group({ name, point: 0 });
    const pointInsertionIndex = this.questionScorings.controls.findIndex(control =>
      this.compareLabels(name, control.value.name) < 0);
    this.questionScorings.insert(
      pointInsertionIndex < 0 ? this.questionScorings.length : pointInsertionIndex, point);

    // Les questions et leurs barèmes sont affichés dans deux panneaux distincts,
    // mais constituent une seule donnée fonctionnelle. Force leur mise à jour
    // commune pour que le barème nouvellement créé soit immédiatement rendu.
    this.questionDefinitions.updateValueAndValidity();
    this.questionScorings.updateValueAndValidity();
    this.challengeConfigurationForm.updateValueAndValidity();

    if (!this.questionDefinitionNames.includes(name)) {
      this.questionDefinitionNames.push(name);
      this.questionDefinitionNames.sort((left, right) => this.compareLabels(left, right));
    }
    const removedIndex = this.removedQuestionDefinitions.indexOf(name);
    if (removedIndex >= 0) {
      this.removedQuestionDefinitions.splice(removedIndex, 1);
    }
    this.questionDefinitionName = '';
    this.showPoints = true;
    this.challengeConfigurationForm.markAsDirty();
  }

  removeQuestionDefinition(index: number) {
    const questionName = this.questionDefinitions.at(index).value.name;
    if (this.questionDefinitionNames.includes(questionName)) {
      const i = this.removedQuestionDefinitions.indexOf(this.questionDefinitions.at(index).value.name);
      if (i > -1) {
        this.removedQuestionDefinitions.splice(i, 1);
      }
      this.removedQuestionDefinitions.push(questionName);
    }
    this.questionDefinitions.removeAt(index);
    const pointIndex = this.questionScorings.controls.findIndex(control => control.value.name === questionName);
    if (pointIndex >= 0) {
      this.questionScorings.removeAt(pointIndex);
    }
  }

  deleteChallengeConfiguration() {
    const challengeConfigurationId = this.challengeConfiguration.id;
    if (!challengeConfigurationId) {
      return;
    }
    this.confirmationDialogService.confirm(
      'Suppresion d\'une épreuve',
      'Supprimer l\'épreuve ' + this.challengeConfiguration.challenge + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          this.challengeConfigurationService.deleteChallengeConfiguration(challengeConfigurationId).subscribe(() => {
            this.router.navigateByUrl('/challenges/validationConfiguration');
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }

  onDeleteFormRecognitionConfiguration(event: unknown) {
    console.log('onDeleteFormRecognitionConfiguration');
    console.log(event);
    this.ngOnInit();
  }

  onSubmit() {
    if (this.challengeConfigurationForm.invalid) {
      this.challengeConfigurationForm.markAllAsTouched();
      return;
    }

    const modifiedQuestionScorings = this.getModifiedQuestionScorings();
    const modifiedPerformanceScorings = this.getModifiedPerformanceScorings();
    const modifiedQuestionDefinitions = this.getModifiedQuestionDefinitions();
    const challengeValue = Number(this.challengeConfigurationForm.value.challenge);

    // 🔎 récupérer l'id du groupe choisi dans le formulaire
    const groupId: string = this.challengeConfigurationForm.value.groupId;
    const selectedGroup = groupId
      ? (this.challengeGroups.find(g => g.id === groupId) || null)
      : null;

    this.challengeConfigurationService.updateChallengeConfiguration({
      id: this.challengeConfiguration.id,
      version: this.challengeConfiguration.version,
      challenge: challengeValue,
      name: this.challengeConfigurationForm.value.name,
      questionScorings: modifiedQuestionScorings,
      performanceScorings: modifiedPerformanceScorings,
      questionDefinitions: modifiedQuestionDefinitions,
      group: selectedGroup
    }).subscribe(data => {
      console.log(data);
      this.challengeConfiguration = data;
      this.ngOnInit();
    }, error => {
      if (error?.status === 409) {
        const reload = window.confirm(
          'Cette \u00e9preuve a \u00e9t\u00e9 modifi\u00e9e dans une autre fen\u00eatre. Recharger la version actuelle ?');
        if (reload) {
          this.ngOnInit();
        }
        return;
      }
      console.log(error);
    });
  }

  private getModifiedQuestionScorings(): QuestionScorings {
    const modifiedQuestionScorings: QuestionScorings = {};
    this.challengeConfigurationForm.value.questionScorings.forEach((item: QuestionScoring) => {
      const questionPoint = this.challengeConfiguration.questionScorings[item.name];
      if (!questionPoint || questionPoint.point !== item.point) {
        if (item.point === null || item.point === undefined || Number.isNaN(item.point)) {
          item.point = 0;
        }
        modifiedQuestionScorings[item.name] = item;
      }
    });
    return modifiedQuestionScorings;
  }

  private getModifiedPerformanceScorings(): PerformanceScorings {
    const modifiedPerformanceScorings: PerformanceScorings = {};
    this.challengeConfigurationForm.value.performanceScorings.forEach((item: any) => {
      const performancePoint = this.challengeConfiguration.performanceScorings[item.name];
      item.ranges.forEach((range: any, rangeIndex: number) => {
        if (performancePoint.ranges.length > rangeIndex) {
          const rangePoint = performancePoint.ranges[rangeIndex];
          if (rangePoint.type !== range.type ||
            rangePoint.begin !== range.begin ||
            rangePoint.end !== range.end ||
            rangePoint.point !== range.point ||
            rangePoint.expression !== range.expression) {
            modifiedPerformanceScorings[item.name] = item;
          }
        } else {
          if (((range.point && range.point !== 0) || range.expression) && range.type) {
            modifiedPerformanceScorings[item.name] = item;
          }
        }
      });
      item.ranges = item.ranges.filter((range: PerformanceScoringRange) => (range.point || range.expression) && range.type);
    });
    return modifiedPerformanceScorings;
  }

  private getModifiedQuestionDefinitions(): QuestionDefinitions {
    const modifiedQuestionDefinitions: QuestionDefinitions = {};
    this.challengeConfigurationForm.value.questionDefinitions.forEach((item: QuestionDefinition) => {
      const question = this.challengeConfiguration.questionDefinitions[item.name];
      if (!question) {
        modifiedQuestionDefinitions[item.name] = item;
      } else {
        if (item.type !== question.type) {
          const patch: PartialQuestionDefinition = { name: item.name };
          if (item.type !== question.type) {
            patch.type = item.type;
          }
          modifiedQuestionDefinitions[item.name] = patch as QuestionDefinition;
        }
      }
    });
    this.removedQuestionDefinitions.forEach((removed) => {
      const patch: PartialQuestionDefinition = { name: removed };
      modifiedQuestionDefinitions[removed] = patch as QuestionDefinition;
    });
    return modifiedQuestionDefinitions;
  }

  onPerfPointAllocationType(value: string, range: UntypedFormGroup) {
    const currentType = range.value.type as PerformanceRangeType | undefined;
    const currentAllocation = currentType ? this.perfPointAllocationType[currentType] : undefined;
    if (this.isPerfPointAllocation(value) && currentAllocation !== value) {
      range.patchValue({ type: this.perfPointDefaultRangeType[value] });
    }
  }

  onChangePerformanceScoringRange(value: string, ranges: UntypedFormArray, index: number) {
    console.log('onChangePerformanceScoringRange : ' + index);
    if (index === ranges.length - 1) {
      if (value) {
        ranges.push(this.buildFormGroup({} as PerformanceScoringRange));
      }
    } else if (!value) {
      const range = ranges.at(index).value;
      if (!range.point && !range.expression) {
        ranges.removeAt(index);
      }
    }
  }

  onClickDetailPoint(range: UntypedFormGroup) {
    const modalRef: AppDialogRef<ModifyPerformanceScoringRangeComponent, PerformanceScoringRange> = this.dialogService.open(ModifyPerformanceScoringRangeComponent, { size: 'xl' });
    modalRef.componentInstance.range = range.value as PerformanceScoringRange;
    modalRef.result.then((result) => {
      if (!result) {
        return;
      }
      console.log(result);
      range.patchValue({ point: result.point, expression: result.expression });
    }).catch((error) => {
      console.log(error);
    });
  }

  private isPerfPointAllocation(value: string): value is PerfPointAllocation {
    return value === 'SCORE' || value === 'DATE' || value === 'RANK';
  }

  private compareLabels(left: string, right: string): number {
    return left.localeCompare(right, 'fr', {
      sensitivity: 'base',
      numeric: true
    });
  }

  private uniqueChallengeValidator(control: AbstractControl) {
    if (!control) { return null; }
    const challenge = Number(control.value);
    if (!challenge) { return null; }

    const currentId = this.challengeConfiguration?.id;
    const challengesInUse = this.challengeConfigurations
      .filter(configuration => configuration.id !== currentId)
      .map(configuration => configuration.challenge);

    if (challengesInUse.includes(challenge)) {
      return { uniqueChallenge: true };
    }
    return null;
  }
}
