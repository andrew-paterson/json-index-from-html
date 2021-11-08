var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
const { JSDOM } = jsdom;

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
        if (path.extname(name) === '.html') {
          files_.push(name);
        }
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
  const headers = {};
  opts.includeSelectors.forEach(selector => { 
    const elements = Array.from(dom.querySelectorAll(selector));
    elements.forEach(element => {
      if (!element) { return; }
      headerLevels.forEach(headerLevel => {
        const headerEls = Array.from(element.querySelectorAll(headerLevel));
        if (headerEls.length > 0) {
          headers[headerLevel] = headerEls.map(header => parseString(header.textContent));
          const pageTitle = pageTitleElement(dom);
          pageTitle.remove();
        }
      });
      bodyText += element.textContent;
    });
  });
  if (!bodyText && headers === {}) { return;}
  finalArray.push({
    href: path.dirname(filePath.replace(opts.sourceDir, '')),
    body: parseString(bodyText),
    headers: headers
  });
  return finalArray;
}

module.exports = {
  run(opts) {
    const sourceDirAbsolute = path.resolve(process.cwd(), opts.sourceDir);
    var absoluteExclueUrls = (opts.excludeUrls || []).map(excludePath => {
      return path.join(sourceDirAbsolute, excludePath)
    });

    var filesToIndex = getFiles(opts.sourceDir).filter(filePath => {
      return absoluteExclueUrls.indexOf(filePath) < 0;
    });
    
    var pagesIndex = [];
    filesToIndex.filter(item => {
      return item;
    }).forEach(filePath => {
      pagesIndex = pagesIndex.concat(processHTMLFile(filePath, opts));
    });

    var final = {searchIndex: pagesIndex};
    
    fs.writeFile(`${opts.outPath}`, JSON.stringify(final, null, 2), function(err) {
      if(err) {
        return console.log(err);
      }
      console.log(`Success! ${opts.outPath} was saved`);
    });
  }
}

