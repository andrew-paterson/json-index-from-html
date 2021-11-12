var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
const { JSDOM } = jsdom;
const minimatch = require('minimatch');

function getFiles(dir, files_) {
  files_ = files_ || [];
  var files;
  try {
    files = fs.readdirSync(dir);
    for (var i in files) {
      var name = dir + '/' + files[i];
      if (fs.statSync(name).isDirectory()) {
        getFiles(name, files_);
      } else {
        files_.push(name);
      }
    }
    return files_;
  } catch (err) {
    console.log(err);
  } 
}

function removeExtraSpaces(string, whiteSpaceReplacement = ' ') {
  string = string.trim();
  string = string.replace(/\s+/g, whiteSpaceReplacement);
  return string;
}

function parseString(string) {
  if (!string) { return; }
  return removeExtraSpaces(string.replace(/&nbsp;/g, ' '));
}

function pageTitleElement(dom) {
  const headerLevels = ['h1','h2','h3','h4','h5','h6'];
  for (var headerLevel of headerLevels) {
    if (dom.querySelector(headerLevel)) {
      return dom.querySelector(headerLevel);
    }
  }
}

function processHTMLFile(filePath, opts) {
  var html = fs.readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(html).window.document;
  (opts.excludeSelectors || []).forEach(excludeSelector => {
    const els = Array.from(dom.querySelectorAll(excludeSelector));
    if (els.length > 0) {
      els.forEach(el => el.remove());
    }
  });
  var bodyText = '';
  var finalArray = [];
  const headerLevels = ['h1','h2','h3','h4','h5','h6'];
  const content = {};
  opts.includeSelectors.forEach(selector => { 
    const elements = Array.from(dom.querySelectorAll(selector));
    elements.forEach(element => {
      if (!element) { return; }
      headerLevels.forEach(headerLevel => {
        const headerEls = Array.from(element.querySelectorAll(headerLevel));
        if (headerEls.length > 0) {
          content[headerLevel] = headerEls.map(header => parseString(header.textContent));
          const pageTitle = pageTitleElement(dom);
          pageTitle.remove();
        }
      });
      bodyText += element.textContent;
    });
  });
  content.body = bodyText ? parseString(bodyText) : null;
  if (!bodyText && headers === {}) { return;}
  const relativeFilePath = filePath.replace(opts.sourceDir, '');
  finalArray.push({
    href: opts.hrefFunction ? opts.hrefFunction(relativeFilePath) : relativeFilePath,
    title: (content.h1 || []).length === 1 ? content.h1[0] : (dom.querySelector('title') || {}).textContent,
    content: content
  });
  return finalArray;
}

function minimatchCount(string, patterns = []) {
  const final = {
    total: patterns.length,
    matches: 0
  }
  patterns.forEach(pattern => {
    if (minimatch(string, pattern)) {
      final.matches ++
    }
  });
  return final;
}

module.exports = function(opts) {
    const sourceDirAbsolute = path.resolve(process.cwd(), opts.sourceDir);
    const includePaths = opts.includePaths || ['*.html', '**/*.html'];
    var absoluteIncludePaths = includePaths.map(includePath => {
      return path.join(sourceDirAbsolute, includePath)
    });
    var absoluteExcluePaths = (opts.excludePaths || []).map(excludePath => {
      return path.join(sourceDirAbsolute, excludePath)
    });
    var filesToIndex = getFiles(opts.sourceDir).filter(filePath => {
     
      return minimatchCount(filePath, absoluteIncludePaths).matches > 0;
    })
    .filter(filePath => {
      return minimatchCount(filePath, absoluteExcluePaths).matches === 0;
    });
    var pagesIndex = [];
    filesToIndex.filter(item => {
      return item;
    }).forEach(filePath => {
      pagesIndex = pagesIndex.concat(processHTMLFile(filePath, opts));
    });
    
    fs.writeFile(`${opts.outPath}`, JSON.stringify(pagesIndex, null, 2), function(err) {
      if(err) {
        return console.log(err);
      }
      console.log(`Success! ${opts.outPath} was saved`);
    });
  }


