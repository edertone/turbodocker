# PDF tools microservice

This is a Dockerized microservice utility with general purpose PDF manipulation tools.

It exposes several HTTP (no https) API endpoints at the 5001 port

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

**Usage example with php:**

```
// Call to the HTML to PDF conversion microservice
$ch = curl_init('http://html-pdf-converter:5001/convert-to-base64');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['html' => $report]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$pdf = curl_exec($ch);

if ($pdf === false) {
    $errorMsg = curl_error($ch);
    curl_close($ch);
    return $errorMsg;
}

curl_close($ch);

return $pdf;
```
