# Welcome to ki-forms

Using this **ki-forms** package you can easily add forms in your ReactJs/NextJs Projects, without doing anything at all.
 If you want to learn about **ki-forms**, you can visit documentation page. 
 



# Installation
Using npm:

```
npm i ki-forms

```
# Dependencies
This package build using TailwindCSS, so you need TailwindCSS to work correctly.
 for TailwindCSS Installation: https://tailwindcss.com/docs/installation



# How To Use

**Import Component:**
```
import { FormInput } from "ki-forms";

```

**Use Component:**
```

 <FormInput inputType="text" placeholder="Username" />


```

That's It!!








## Components
Bellow mentioned all the available Components





|**Name**            |**Props**                         |**values**      |
|--------------------|----------------------------------|----------------|
|`<FormInput />`      |`inputType` *(required)*  | `text`,`number`,`email`,`button`, `checkbox`, `file `,`radio` and all HTML Form Input Types|
| |`placeholder` *(optional)* |types *`"string"`* |
| |`value` *(optional)* |types *`"string"`* or  *`"number"`*|
| |`className` *(optional)* |types *`"string"`*|
| |`onClick` *(optional)* |*`MouseEventHandler`*|
| |`onMouseEnter` *(optional)* |*`MouseEventHandler`*|
| |`onMouseLeave` *(optional)* |*`MouseEventHandler`*|
|`<FormInputTextarea />`      ||`placeholder` *(optional)* |types *`"string"`* |
| |`value` *(optional)* |types *`"string"`* or  *`"number"`*|
| |`className` *(optional)* |types *`"string"`*|
| |`onClick` *(optional)* |*`MouseEventHandler`*|
| |`onMouseEnter` *(optional)* |*`MouseEventHandler`*|
| |`onMouseLeave` *(optional)* |*`MouseEventHandler`*|




We are working on more Components soon!!!




