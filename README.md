Generates a JSON text index from a directory of files containing HTML code, with configuration options to choose which files and elements are included or excluded from indexing.

The JSON output is an array of objects, with one item for each file that is indexed.
 
### Example output

    [{
      "href": "/contact",
      "body": "You can contact us in various ways. Email info@example.com Phone 055 555 5555 Address 1 Long Street City Cape Town Country South Africa.",
      "headers": {
        "h1": [
          "Contact"
        ],
        "h2": [
          "Address",
          "Phone",
          "Email"
        ],
        "h3": [
          "City",
          "Country"
        ]
      }
    }]

## Installation

`npm i json-index-from-html`

## Basic usage

    const jsonIndexFromHtml = require('json-index-from-html');

    jsonIndexFromHtml(options);

## Options

### sourceDir

String (required)

Path to the root directory containing the files to be indexed,

### outPath

String (required) 

Path of the output file, including the file extension (Probably .json),

### includePaths

Array (optional) 

Default = `['*.html', '**/*.html']`

An array of filepaths or glob patterns to set which files will be indexed. The paths or globs are resolved relative to the `sourceDir`. 

### excludePaths

Array (optional) 

An array of filepaths or glob patterns to exclude from indexing. The paths or globs are resolved relative to the `sourceDir`. Matching files are excluded from the filtered file list that results from applying the `includePaths` above.

### includeSelectors

Array (optional) 

An array of element selectors to include in the indexing. The `textContent` from each matched element will be included in the index. 

Note that if not specified, each item in the index will include the text content from any repeating elements, such as the site headers, main nav or footer, which is likely undesirable.

### excludeSelectors

Array (optional) 

An array of element selectors to exclude from the indexing. The `textContent` from each matched element will not be included in the index.

### hrefFunction

Function (optional)

By default, the `href` property of each item in the index will be the filepath relative to the `sourceDir`. This can be customised by passing a function as `hrefFunction`, which receives the relative file path as its only argument.

#### hrefFunction examples

My website filepaths all end in `/index.html`, but my webserver ignores this, using only the directory path. Thus the html file at `/contact/index.html` is accessed at `/contact`. I could pass the function below to only use the directory path as the href in the index.

    hrefFunction(relativeFilePath) {
      return path.dirname(relativeFilePath);
    }

Likewise, I could add my website base url to have absolute urls as the href.

    hrefFunction(relativeFilePath) {
      return `https://example.com${relativeFilePath}`;
    }

## Usage example

Assuming I have a site at `./my-site-folder` and the only file in it is `my-site-folder/contact/index.html`, with the following HTML:

    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contact</title>
    </head>
    <body>
      <header>
        <nav>
          <ul>
            <li><a href="/about"></a>About</li>
            <li><a href="/contact"></a>Contact</li>
          </ul>
        </nav>
      </header>
      <div class="content">
        <h1>Contact</h1>
        <p>You can contact us in various ways.</p>
        <h2>Email</h2>
        <p>info@example.com</p>
        <h2>Phone</h2>
        <p>055 555 5555</p>
        <h2>Address</h2>
        <p>1 Long Street</p>
        <h3>City</h3>
        <p>Cape Town</p>
        <h3>Country</h3>
        <p>South Africa</p>
        <div class="social-sharing">
          Share this page on social media
          <button>Share</button>
        </div>
      </div>
    </body>
    </html>

The following implementation will output the JSON below:

    const jsonIndexFromHtml = require('json-index-from-html');
    const path = require('path');

    jsonIndexFromHtml({
      sourceDir: './my-site-folder',
      outPath: '/my-site-folder/search-index.json',
      includeSelectors: ['.content'],
      excludeSelectors: ['.social-sharing'],
      hrefFunction(relativeFilePath) {
        return path.dirname(relativeFilePath);
      }
    });

### Result

The file `./my-site-folder/search-index.json` wpould be generated, with the following contents:

    [
      {      
        "href": "/contact",
        "body": "You can contact us in various ways. Email info@example.com Phone 055 555 5555 Address 1 Long Street City Cape Town Country South Africa.",
        "headers": {
          "h1": [
            "Contact"
          ],
          "h2": [
            "Address",
            "Phone",
            "Email"
          ],
          "h3": [
            "City",
            "Country"
          ]
        }
      }
    ]