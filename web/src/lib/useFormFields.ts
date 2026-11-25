import { useState } from 'react'

export function useFormFields<T extends Record<string, string>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues)
  const [fieldErrors, setFieldErrors] = useState<Record<keyof T, string | null>>(() => {
    const initial = {} as Record<keyof T, string | null>
    for (const key of Object.keys(initialValues) as Array<keyof T>) {
      initial[key] = null
    }
    return initial
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function updateField<K extends keyof T>(field: K, value: T[K]) {
    setValues((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => (prev[field] === null ? prev : { ...prev, [field]: null }))
    setSubmitError((prev) => (prev === null ? prev : null))
  }

  return {
    values,
    fieldErrors,
    setFieldErrors,
    submitError,
    setSubmitError,
    submitting,
    setSubmitting,
    updateField,
  }
}
