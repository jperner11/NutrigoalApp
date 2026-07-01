// Custom anamnesis types for coach intake questions/responses.
// These re-export the existing canonical interfaces from `../types.ts`
// so feature code can import from a stable, feature-scoped path.

export type {
  CustomIntakeQuestionType,
  PersonalTrainerCustomIntakeQuestion,
  PersonalTrainerCustomIntakeResponse,
} from '../types'

export type CustomIntakeResponseValue = string | string[] | boolean | null

export interface CustomIntakeQuestionInput {
  label: string
  help_text?: string | null
  type:
    | 'short_text'
    | 'long_text'
    | 'single_select'
    | 'multi_select'
    | 'yes_no'
  options?: string[]
  required?: boolean
  sort_order?: number
  is_active?: boolean
}

export interface CustomIntakeResponseInput {
  question_id: string
  response_text?: string | null
  response_json?: string[] | boolean | null
}
