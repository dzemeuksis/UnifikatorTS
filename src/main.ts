import { unifyValuesAuto, UnifyOptions } from './unifier';

function showError(msg: string) {
  const errDiv = document.getElementById('error')!;
  errDiv.textContent = msg;
  errDiv.hidden = false;
}

function clearError() {
  const errDiv = document.getElementById('error')!;
  errDiv.textContent = '';
  errDiv.hidden = true;
}

function getInputValue(id: string): string {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
  return el.value;
}

function getCheckboxValue(id: string): boolean {
  const el = document.getElementById(id) as HTMLInputElement;
  return el.checked;
}

document.getElementById('unifyBtn')?.addEventListener('click', () => {
  clearError();
  try {
    const valuesText = getInputValue('valuesInput');
    const values = valuesText.split('\n').map(v => v.trim());

    const options: UnifyOptions = {
      distanceThreshold: parseFloat(getInputValue('distanceThreshold')),
      distanceMetric: getInputValue('distanceMetric') as any,
      clusterLinkage: getInputValue('clusterLinkage') as any,
      representativeStrategy: getInputValue('representativeStrategy') as any,
      lowercase: getCheckboxValue('lowercase'),
      stripChars: getInputValue('stripChars'),
      removeInternalChars: getInputValue('removeInternalChars'),
      minClusterSizeForRepresentationChange: parseInt(getInputValue('minClusterSize'), 10),
    };
    const preprocessorCode = getInputValue('preprocessorCode').trim();
    if (preprocessorCode) {
      try {
        options.preprocessor = eval(preprocessorCode);
      } catch (e: any) {
        throw new Error(`Invalid preprocessor code: ${e.message || e}`);
      }
    }

    const result = unifyValuesAuto(values, options);
    (document.getElementById('resultOutput') as HTMLTextAreaElement).value = result.join('\n');
  } catch (e: any) {
    showError(e.message || String(e));
  }
});