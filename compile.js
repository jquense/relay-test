const promisify = require('es6-promisify')
const fs = require('fs')
const path = require('path')
const { buildASTSchema, parse } = require('graphql')
const {
  Compiler,
  FileIRParser,
  FileWriter,
  IRTransforms,
} = require('relay-compiler')

// const ASTConvert = require('relay-compiler/lib/ASTConvert');
const RelayCompilerContext = require('relay-compiler/lib/RelayCompilerContext')

const glob = promisify(require('glob'))

const {
  codegenTransforms,
  fragmentTransforms,
  printTransforms,
  queryTransforms,
  schemaTransforms,
} = IRTransforms

const getLocations = () => {
  return {
    baseDir: `${__dirname}/src`,
    schema: `${__dirname}/schema.graphql`,
  }
}

function getSchema() {
  try {
    return buildASTSchema(
      parse(
        `
          directive @include(if: Boolean) on FRAGMENT | FIELD
          directive @skip(if: Boolean) on FRAGMENT | FIELD
          ${fs.readFileSync(getLocations().schema, 'utf8')}
        `
      )
    )
  } catch (error) {
    throw new Error(
      `
Error loading schema. Expected the schema to be a .graphql file using the
GraphQL schema definition language. Error detail:
${error.stack}
    `.trim()
    )
  }
}

function getWriter(schema, documents, baseDocuments) {
  return new FileWriter({
    config: {
      buildCommand: 'sdfsdg',
      compilerTransforms: {
        codegenTransforms,
        fragmentTransforms,
        printTransforms,
        queryTransforms,
      },
      baseDir: getLocations().baseDir,
      schemaTransforms,
    },
    schema,
    baseDocuments,
    documents,
  })
}

class Runner {
  constructor() {
    const { schema, baseDir } = getLocations()
    this.baseDir = baseDir
    this.schema = schema
    this.parser = FileIRParser.getParser(baseDir)
  }

  async compileAll() {
    await this.parseEverything()
    await this.write()
  }

  async parseEverything() {
    let files = await glob(`${this.baseDir}/**/*.js`)

    await this.parser.parseFiles(files.map(f => path.relative(this.baseDir, f)))
  }

  async write() {
    const tStart = Date.now()

    // always create a new writer: we have to write everything anyways
    const documents = this.parser.documents().valueSeq().toArray()
    const schema = getSchema()

    const compilerContext = new RelayCompilerContext(schema)
    const compiler = new Compiler(schema, compilerContext, {
      codegenTransforms,
      fragmentTransforms,
      printTransforms,
      queryTransforms,
    })

    compiler.addDefinitions(documents);

    const transformedQueryContext = compiler.transformedQueryContext()
    const compiledDocumentMap = compiler.compile()
  }
}

function printFiles(label, files) {
  if (files.length > 0) {
    console.log(label + ':')
    files.forEach(file => {
      console.log(' - ' + file)
    })
  }
}

new Runner().compileAll()
