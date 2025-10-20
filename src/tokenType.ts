enum TokenType {
  goTemplate,
  begin,
  end,
  comment,
  rawString,
  string,
  variable,
  assignment,
  pipe,
  property,
  control,
  builtin,
  stringEscape,
  unknownEscape,
  placeholder,
  number,
}

export default TokenType;
