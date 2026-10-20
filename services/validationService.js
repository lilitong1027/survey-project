
const isEmpty = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

const fail = (message) => ({
  valid: false,
  message,
});

const pass = () => ({
  valid: true,
});

function validateAnswer(question, value) {
  const rules = question.validation || {};

  // 必答题检查
  if (isEmpty(value)) {
    if (question.required) {
      return fail(`题目「${question.title}」为必答题`);
    }

    return pass();
  }

  switch (question.type) {
    case 'single': {
      if (typeof value !== 'string') {
        return fail('单选题答案必须是一个选项 ID');
      }

      const exists = (question.options || []).some(
        (option) => option.option_id === value
      );

      if (!exists) {
        return fail('单选题包含无效选项');
      }

      return pass();
    }

    case 'multiple': {
      if (
        !Array.isArray(value) ||
        !value.every((item) => typeof item === 'string')
      ) {
        return fail('多选题答案必须是选项 ID 数组');
      }

      if (new Set(value).size !== value.length) {
        return fail('多选题不能重复选择同一选项');
      }

      const optionIds = new Set(
        (question.options || []).map((option) => option.option_id)
      );

      if (!value.every((id) => optionIds.has(id))) {
        return fail('多选题包含无效选项');
      }

      if (
        rules.min_selections != null &&
        value.length < rules.min_selections
      ) {
        return fail(
          `至少选择 ${rules.min_selections} 个选项`
        );
      }

      if (
        rules.max_selections != null &&
        value.length > rules.max_selections
      ) {
        return fail(
          `最多选择 ${rules.max_selections} 个选项`
        );
      }

      return pass();
    }

    case 'text': {
      if (typeof value !== 'string') {
        return fail('文本题答案必须是字符串');
      }

      // 按去除首尾空白后的字符数校验
      const length = Array.from(value.trim()).length;

      if (
        rules.min_length != null &&
        length < rules.min_length
      ) {
        return fail(`至少输入 ${rules.min_length} 个字符`);
      }

      if (
        rules.max_length != null &&
        length > rules.max_length
      ) {
        return fail(`最多输入 ${rules.max_length} 个字符`);
      }

      return pass();
    }

    case 'number': {
      // 不接受数字字符串、NaN 或 Infinity
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value)
      ) {
        return fail('数字题答案必须是有效数字');
      }

      if (
        rules.min_value != null &&
        value < rules.min_value
      ) {
        return fail(`数值不能小于 ${rules.min_value}`);
      }

      if (
        rules.max_value != null &&
        value > rules.max_value
      ) {
        return fail(`数值不能大于 ${rules.max_value}`);
      }

      return pass();
    }

    default:
      return fail('不支持的题目类型');
  }
}

module.exports = {
  validateAnswer,
};
