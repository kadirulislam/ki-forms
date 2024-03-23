import React from "react"
import { HTMLInputTypeAttribute, MouseEventHandler } from "react"

function FormInput({
    inputType,
    className,
    placeholder,
    onClick,
    onMouseEnter,
    onMouseLeave
}: {
    inputType:HTMLInputTypeAttribute,
    className?: string,
    placeholder?: string,
    onClick?: MouseEventHandler<HTMLInputElement> | undefined,
    onMouseEnter?:MouseEventHandler<HTMLInputElement> | undefined
    onMouseLeave?:MouseEventHandler<HTMLInputElement> | undefined
}) {
  return (
      <input
          type={inputType}
          className={`py-2 px-2 rounded-md text-md ${className && className}`}
          placeholder={placeholder}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}      
      
      />
  )
}

export  { FormInput }