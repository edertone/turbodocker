# PDF tools microservice

This is a Dockerized microservice utility with general purpose PDF manipulation tools.

It exposes several HTTP (no https) API endpoints at the 5001 port

## Build and run locally (for testing and development):

```
docker build -t pdf-tools . && docker run -p 5001:5001 pdf-tools
```

## PDF pages count

TODO

## PDF to images

TODO

## HTML to PDF

We can generate pixel perfect PDF files from an HTML source.

The webservice has several endpoints that expect html data and return the equivalent pdf rendered using the chromium engine. All the process and temporary data is handled internally by the docker image, so the only requirement is to have enough HDD space for the docker container to run.
All temporary files are automatically cleaned, so no increase in storage should happen during extended usage of this microservice.

**Endpoints**:

    •  /html-to-pdf-binary: Returns the PDF as binary file (Recommended for performance)
    •  /html-to-pdf-base64: Returns the PDF as a base64 string

To generate a pdf, send a POST request with a JSON payload containing the HTML string:

```
{
  "html": "<your html code>"
}
```

The service will directly return the PDF data encoded to the selected format.

**Example: Convert HTML to PDF (base64) using PHP**

```
// Call to the HTML to PDF conversion microservice
$html = '<html><body><h1>Hello, PDF!</h1><p>This is a test.</p></body></html>';

$ch = curl_init('http://html-pdf-converter:5001/html-to-pdf-base64');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['html' => $html]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$pdfBase64 = curl_exec($ch);

if ($pdfBase64 === false) {
    $errorMsg = curl_error($ch);
    // Process the error as necessary
}

curl_close($ch);

// $pdfBase64 now contains the base64-encoded PDF string
return $pdfBase64;
```
