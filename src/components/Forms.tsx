import React, { TextareaHTMLAttributes } from "react";
import { HTMLInputTypeAttribute, MouseEventHandler } from "react"
import "../styles/tailwind.css"
function FormInput({
    inputType,
    className,
    placeholder,
    value,
    onClick,
    onMouseEnter,
    onMouseLeave
}: {
    inputType:HTMLInputTypeAttribute,
    className?: string,
        placeholder?: string,
    value?:string | number | readonly string[] | undefined,
    onClick?: MouseEventHandler<HTMLInputElement> | undefined,
    onMouseEnter?:MouseEventHandler<HTMLInputElement> | undefined
    onMouseLeave?:MouseEventHandler<HTMLInputElement> | undefined
}) {
  return (
      <input
          type={inputType}
          className={`py-3 px-4 rounded-md text-md border-2 border-gray-500 focus:border-black ${className && className}`}
          placeholder={placeholder}
          value={value}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}      
      
      />
  )
}

function FormInputTextarea({
   
    className,
    placeholder,
    value,
    onClick,
    onMouseEnter,
    onMouseLeave
}: {
    
    className?: string,
    placeholder?: string,
    value?:string | number | readonly string[] | undefined,
    onClick?: MouseEventHandler<HTMLTextAreaElement> | undefined,
    onMouseEnter?:MouseEventHandler<HTMLTextAreaElement> | undefined
    onMouseLeave?:MouseEventHandler<HTMLTextAreaElement> | undefined
}) {
  return (
      <textarea
        
          className={`py-3 px-4 rounded-md text-md border-2 border-gray-500 focus:border-black ${className && className}`}
          placeholder={placeholder}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave} 
          value={value}

      
      />
  )
}


export  { FormInput,FormInputTextarea }