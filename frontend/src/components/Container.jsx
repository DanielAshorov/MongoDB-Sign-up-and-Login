import React from 'react'

export default function Container({children, className}) {
  return (
    <div className={"max-w-screen-md mx-auto " + className}>{children}</div>
    );
}
