


graphql`
  fragment Foo_viewer on User {
    id
    totalCount
    ...Bar_viewer,
  }
`