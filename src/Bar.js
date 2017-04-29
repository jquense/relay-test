

graphql`
  fragment Bar_viewer on User {
    id,
    completedCount,
    completedTodos: todos(
      status: "completed",
      first: 2147483647  # max GraphQLInt
    ) {
      edges {
        node {
          id
          complete
        }
      }
    },
    totalCount,
  }
`