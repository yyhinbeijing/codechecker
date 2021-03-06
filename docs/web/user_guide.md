Table of Contents
=================
* [CodeChecker](#codechecker)
    * [Default configuration](#default-configuration)
* [Easy analysis wrappers](#easy-analysis-wrappers)
    * [`check`](#check)
* [`PRODUCT_URL` format](#product-url-format)
    * [Example](#product-url-format-example)
* [Available CodeChecker subcommands](#available-commands)
    * [`store`](#store)
        * [Using SQLite for database](#sqlite)
    * [`server`](#server)
        * [Creating a public server](#public-server)
        * [Configuring database and server settings' location](#server-settings)
        * [Master superuser and authentication forcing](#auth-force)
        * [Enfore secure socket (SSL)](#ssl)
        * [Managing running servers](#managing-running-servers)
        * [Manage server database upgrades](#manage-server-database-upgrade)
    * [`cmd`](#cmd)
        * [`components` (Source components)](#source-components)
            * [`new` (New/Edit source component)](#new-source-components)
                * Format of [component file](#component-file)
            * [`list` (List source components)](#list-source-components)
            * [`del` (Delete source components)](#delete-source-components)
        * [`runs` (List runs)](#cmd-runs)
        * [`history` (List of run histories)](#cmd-history)
        * [`results` (List analysis results' summary)](#cmd-results)
            * [Example](#cmd-results-example)
        * [`diff` (Show differences between two runs)](#cmd-diff)
          * [Example](#cmd-diff-example)
        * [`sum` (Show summarised count of results)](#cmd-sum)
            * [Example](#cmd-sum-example)
        * [`del` (Remove analysis runs)](#cmd-del)
        * [`suppress` (Manage and export/import suppressions)](#manage-suppressions)
            * [Import suppressions between server and suppress file](#import-suppressions)
        * [`products` (Manage product configuration of a server)](#cmd-product)
        * [`login` (Authenticate to the server)](#cmd-login)
* [Source code comments (review status)](#source-code-comments)
    * [Supported formats](#supported-formats)
* [Advanced usage](#advanced-usage)
    * [Run CodeChecker distributed in a cluster](#distributed-in-cluster)
    * [Setup PostgreSQL (one time only)](#pgsql)
    * [Run CodeChecker on multiple hosts](#multiple-hosts)
        * [PostgreSQL authentication (optional)](#pgsql-auth)
* [Debugging CodeChecker](#debug)

# CodeChecker <a name="codechecker"></a>

First of all, you have to setup the environment for CodeChecker.
CodeChecker uses SQLite database (by default) to store the results
which is also packed into the package.

Running CodeChecker is via its main invocation script, `CodeChecker`:

```
usage: CodeChecker [-h]
                   {analyze,analyzers,check,checkers,cmd,log,parse,server,store,version}
                   ...

Run the CodeChecker sourcecode analyzer framework.
Please specify a subcommand to access individual features.

positional arguments:
  {analyze,analyzers,check,checkers,cmd,log,parse,server,store,version}
                        commands

    analyze             Execute the supported code analyzers for the files
                        recorded in a JSON Compilation Database.
    analyzers           List supported and available analyzers.
    check               Perform analysis on a project and print results to
                        standard output.
    checkers            List the checkers available for code analysis.
    cmd                 View analysis results on a running server from the
                        command line.
    log                 Run a build command and collect the executed
                        compilation commands, storing them in a JSON file.
    parse               Print analysis summary and results in a human-readable
                        format.
    server              Start and manage the CodeChecker Web server.
    store               Save analysis results to a database.
    version             Print the version of CodeChecker package that is being
                        used.

optional arguments:
  -h, --help            show this help message and exit

Example scenario: Analyzing, and storing results
------------------------------------------------
Start the server where the results will be stored and can be viewed
after the analysis is done:
    CodeChecker server

Analyze a project with default settings:
    CodeChecker check -b "cd ~/myproject && make" -o "~/results"

Store the analyzer results to the server:
    CodeChecker store "~/results" -n myproject

The results can be viewed:
 * In a web browser: http://localhost:8001
 * In the command line:
    CodeChecker cmd results myproject

Example scenario: Analyzing, and printing results to Terminal (no storage)
--------------------------------------------------------------------------
In this case, no database is used, and the results are printed on the standard
output.

    CodeChecker check -b "cd ~/myproject && make"
```


## Default configuration <a name="default-configuration"></a>

Used ports:

* `5432` - PostgreSQL
* `8001` - CodeChecker server

The server listens only on the local machine.

The initial product is called `Default`.

## `PRODUCT_URL` format <a name="product-url-format"></a>

Several subcommands, such as `store` and `cmd` need a connection specification
on which server and for which *Product* (read more [about
products](products.md)) an action, such as report storage or result
retrieving, should be done.

This is done via the `PRODUCT_URL` where indicated in the subcommand, which
contains the server's access protocol, address, and the to-be-used product's
unique endpoint. The format of this string is:
`[http[s]://]host:port/ProductEndpoint`. This URL looks like a standar Web
browsing (HTTP) request URL.

CodeChecker communicates via HTTP requests, thus the first part specifies
whether or not a more secure SSL/TLS-wrapped `https` protocol should be used.
If omitted, the default value is `http`. The second part is the host and the
port the server listens on. After a `/`, the unique endpoint of the product
must be given, this is case-sensitive. This unique endpoint is configured and
allocated when the [product is created](products.md), by the server's
administrators. The product must exist and be properly configured before any
normal operation could be done on it.

If no URL is specified, the default value `http://localhost:8001/Default` will
be used: a standard HTTP CodeChecker server running on the local machine, on
the default port, using the *Default* product.

### Example <a name="product-url-format-example"></a>

The URL `https://codechecker.example.org:9999/SampleProduct` will access the
server machine `codechecker.example.org` trying to connect to a server
listening on port `9999` via HTTPS. The product `SampleProduct` will be used.

# Available CodeChecker server subcommands <a name="available-commands"></a>

## `store` <a name="store"></a>

A `Codechecker server` needs to be started before the reports can be stored to
a database.

`store` is used to save previously created machine-readable analysis results
(such as `plist` files), usually previously generated by `CodeChecker analyze`
to the database.

```
usage: CodeChecker store [-h] [-t {plist}] [-n NAME] [--tag TAG] [-f]
                         [--url PRODUCT_URL]
                         [--verbose {info,debug,debug_analyzer}]
                         [file/folder [file/folder ...]]

Store the results from one or more 'codechecker-analyze' result files in a
database.

positional arguments:
  file/folder           The analysis result files and/or folders containing
                        analysis results which should be parsed and printed.
                        (default: /home/<username>/.codechecker/reports)

optional arguments:
  -h, --help            show this help message and exit
  -t {plist}, --type {plist}, --input-format {plist}
                        Specify the format the analysis results were created
                        as. (default: plist)
  -n NAME, --name NAME  The name of the analysis run to use in storing the
                        reports to the database. If not specified, the '--
                        name' parameter given to 'codechecker-analyze' will be
                        used, if exists.
  --tag TAG             A unique identifier for this individual store of results
                        in the run's history.
  --trim-path-prefix [TRIM_PATH_PREFIX [TRIM_PATH_PREFIX ...]]
                        Removes leading path from files which will be stored.
                        So if you have /a/b/c/x.cpp and /a/b/c/y.cpp then by
                        removing "/a/b/" prefix will store files like c/x.cpp
                        and c/y.cpp. If multiple prefix is given, the longest
                        match will be removed.
  -f, --force           Delete analysis results stored in the database for the
                        current analysis run's name and store only the results
                        reported in the 'input' files. (By default,
                        CodeChecker would keep reports that were coming from
                        files not affected by the analysis, and only
                        incrementally update defect reports for source files
                        that were analysed.)
  --verbose {info,debug,debug_analyzer}
                        Set verbosity level.

server arguments:
  Specifies a 'CodeChecker server' instance which will be used to store the
  results. This server must be running and listening, and the given product
  must exist prior to the 'store' command being run.

  --url PRODUCT_URL     The URL of the product to store the results for, in
                        the format of '[http[s]://]host:port/Endpoint'.
                        (default: localhost:8001/Default)


The results can be viewed by connecting to such a server in a Web browser or
via 'CodeChecker cmd'.
```

For example, if the analysis was run like:

```sh
CodeChecker analyze ../codechecker_myProject_build.log -o ./my_plists
```

then the results of the analysis can be stored with this command:

```sh
CodeChecker store ./my_plists -n my_project
```

### Using SQLite for database <a name="sqlite"></a>

CodeChecker can also use SQLite for storing the results. In this case the
SQLite database will be created in the workspace directory.

In order to use PostgreSQL instead of SQLite, use the `--postgresql` command
line argument for `CodeChecker server` command.
If `--postgresql` is not given then SQLite is used by default in
which case `--dbport`, `--dbaddress`, `--dbname`, and
`--dbusername` command line arguments are ignored.

**NOTE!** Schema migration is not supported with SQLite. This means if you
upgrade your CodeChecker to a newer version, you might need to re-check your
project.

## `server` <a name="server"></a>

To view and store the analysis reports in a database, a `CodeChecker server`
must be started. This is done via the `server` command, which creates a
standard Web server and initializes or connects to a database with
the given configuration.

The CodeChecker Viewer server can be browsed by a Web browser by opening the
address of it (by default, [`http://localhost:8001`](http://localhost:8001)),
or via the `CodeChecker cmd` command-line client.

```
usage: CodeChecker server [-h] [-w WORKSPACE] [-f CONFIG_DIRECTORY]
                          [--host LISTEN_ADDRESS] [-v PORT] [--not-host-only]
                          [--sqlite SQLITE_FILE | --postgresql]
                          [--dbaddress DBADDRESS] [--dbport DBPORT]
                          [--dbusername DBUSERNAME] [--dbname DBNAME]
                          [--reset-root] [--force-authentication]
                          [-l | -s | --stop-all]
                          [--verbose {info,debug,debug_analyzer}]

The CodeChecker Web server is used to handle the storage and navigation of
analysis results. A started server can be connected to via a Web browser, or
by using the 'CodeChecker cmd' command-line client.

optional arguments:
  -h, --help            show this help message and exit
  -w WORKSPACE, --workspace WORKSPACE
                        Directory where CodeChecker can store analysis result
                        related data, such as the database. (Cannot be
                        specified at the same time with '--sqlite' or
                        '--config-directory'.) (default:
                        /home/<username>/.codechecker)
  -f CONFIG_DIRECTORY, --config-directory CONFIG_DIRECTORY
                        Directory where CodeChecker server should read server-
                        specific configuration (such as authentication
                        settings, and SSL certificates) from. 
                        (default: /home/<username>/.codechecker)
  --host LISTEN_ADDRESS
                        The IP address or hostname of the server on which it
                        should listen for connections. (default: localhost)
  -v PORT, --view-port PORT, -p PORT, --port PORT
                        The port which will be used as listen port for the
                        server. (default: 8001)
  --not-host-only       If specified, storing and viewing the results will be
                        possible not only by browsers and clients running
                        locally, but to everyone, who can access the server
                        over the Internet. (Equivalent to specifying '--host
                        ""'.) (default: False)
  --skip-db-cleanup     Skip performing cleanup jobs on the database like
                        removing unused files.
  --verbose {info,debug,debug_analyzer}
                        Set verbosity level.

configuration database arguments:
  --sqlite SQLITE_FILE  Path of the SQLite database file to use. (default:
                        <CONFIG_DIRECTORY>/config.sqlite)
  --postgresql          Specifies that a PostgreSQL database is to be used
                        instead of SQLite. See the "PostgreSQL arguments"
                        section on how to configure the database connection.

PostgreSQL arguments:
  Values of these arguments are ignored, unless '--postgresql' is specified!

  --dbaddress DBADDRESS, --db-host DBADDRESS
                        Database server address. (default: localhost)
  --dbport DBPORT, --db-port DBPORT
                        Database server port. (default: 5432)
  --dbusername DBUSERNAME, --db-username DBUSERNAME
                        Username to use for connection. (default: codechecker)
  --dbname DBNAME, --db-name DBNAME
                        Name of the database to use. (default: config)
```

To start a server with default configuration, simply execute

```sh
CodeChecker server
```

### Creating a public server <a name="public-server"></a>

```
  --host LISTEN_ADDRESS
                        The IP address or hostname of the server on which it
                        should listen for connections. (default: localhost)
  --not-host-only       If specified, viewing the results will be possible not
                        only by browsers and clients running locally, but to
                        everyone, who can access the server over the Internet.
                        (Equivalent to specifying '--host ""'.) (default:
                        False)
```

By default, the running server can only be accessed from the same machine
(`localhost`) where it is running. This can be overridden by specifying
`--host ""`, instructing the server to listen on all available interfaces.

### Configuring database and server settings location  <a name="server-settings"></a>

The `--sqlite` (or `--postgresql` and the various `--db-` arguments) can be
used to specify where the database, containing the analysis reports is.

`--config-directory` specifies where the server configuration files, such as
[authentication config](authentication.md) is. For example, one can start
two servers with two different product layout, but with the same authorisation
configuration:

```sh
CodeChecker server --sqlite ~/major_bugs.sqlite -f ~/.codechecker -p 8001
CodeChecker server --sqlite ~/minor_bugs.sqlite -f ~/.codechecker -p 8002
```

The `--workspace` argument can be used to _shortcut_ this specification: by
default, the configuration directory is the _workspace_ itself, and therein
resides the `config.sqlite` file, containing the product configuration.

If the server is started in `--sqlite` mode and fresh, that is, no product
configuration file is found, a product named `Default`, using `Default.sqlite`
in the configuration directory is automatically created. Please see
[Product management](products.md) for details on how to configure products.

### Master superuser and authentication forcing <a name="auth-force"></a>

```
root account arguments:
  Servers automatically create a root user to access the server's
  configuration via the clients. This user is created at first start and
  saved in the CONFIG_DIRECTORY, and the credentials are printed to the
  server's standard output. The plaintext credentials are NEVER accessible
  again.

  --reset-root          Force the server to recreate the master superuser
                        (root) account name and password. The previous
                        credentials will be invalidated, and the new ones will
                        be printed to the standard output.
  --force-authentication
                        Force the server to run in authentication requiring
                        mode, despite the configuration value in
                        'session_config.json'. This is needed if you need to
                        edit the product configuration of a server that would
                        not require authentication otherwise.
```

### Enfore secure socket (SSL) <a name="ssl"></a>

You can enforce SSL security on your listening socket. In this case all clients must
access your server using the `https://host:port` URL format.

To enable SSL simply place an SSL certificate to `<CONFIG_DIRECTORY>/cert.pem`
and the corresponding private key to `<CONFIG_DIRECTORY>/key.pem`.
You can generate these certificates for example 
using the [openssl tool](https://www.openssl.org/).
When the server finds these files upon start-up, 
SSL will be automatically enabled. 

### Managing running servers <a name="managing-running-servers"></a>

```
running server management:
  -l, --list            List the servers that has been started by you.
  -r, --reload          Sends the CodeChecker server process a SIGHUP signal,
                        causing it to reread it's configuration files.
  -s, --stop            Stops the server associated with the given view-port
                        and workspace.
  --stop-all            Stops all of your running CodeChecker server
                        instances.
```

CodeChecker servers can be started in the background as any other service, via
common shell tools such as `nohup` and `&!`. The running instances can be
queried via `--list`.

Calling `CodeChecker server --stop` will stop the "default" server, i.e. one
that was started by simply calling `CodeChecker server`. This _"stop"_ command
is equivalent to pressing `Ctrl`-`C` in the server's terminal, resulting in an
immediate termination of the server.

A server running on a specific and port can be stopped by:

```sh
CodeChecker server -w ~/my_codechecker_workspace -p 8002 --stop
```

`--stop-all` will stop every running server that is printed by `--list`.

`CodeChecker server --reload` command allows you to changing configuration-file
options that do not require a complete restart to take effect. For more
information which option can be reloaded see
[server config](server_config.md).

### Manage server database upgrades <a name="manage-server-database-upgrade"></a>

Use these arguments to manage the database versions handled by the server.
For a more detailed description about the schema upgrade check out the
[schema migration guide](db_schema_guide.md).

```
Database management arguments.:
  WARNING these commands needs to be called with the same workspace and
  configuration arguments as the server so the configuration database will
  be found which is required for the schema migration. Migration can be done
  without a running server but pay attention to use the same arguments which
  will be used to start the server. NOTE: Before migration it is advised to
  create a full a backup of the product databases.

  --status STATUS       Name of the product to get the database status for.
                        Use 'all' to list the database statuses for all of the
                        products.
  --upgrade-schema PRODUCT_TO_UPGRADE
                        Name of the product to upgrade to the latest database
                        schema available in the package. Use 'all' to upgrade
                        all of the products.NOTE: Before migration it is
                        advised to create a full backup of the product
                        databases.
  --db-force-upgrade    Force the server to do database migration without user
                        interaction. NOTE: Please use with caution and before
                        automatic migration it is advised to create a full
                        backup of the product databases.
```


## `cmd` <a name="cmd"></a>

The `CodeChecker cmd` is a lightweight command line client that can be used to
view analysis results from the command-line. The command-line client can also
be integrated into a continuous integration loop or can be used to schedule
maintenance tasks.

Most of the features available in a Web browser opening the analysis result
viewer server on its port is available in the `cmd` tool.

```
usage: CodeChecker cmd [-h]
                       {runs,results,diff,sum,del,suppress,products,login} ...

The command-line client is used to connect to a running 'CodeChecker server'
(either remote or local) and quickly inspect analysis results, such as runs,
individual defect reports, compare analyses, etc. Please see the invidual
subcommands for further details.

optional arguments:
  -h, --help            show this help message and exit

available actions:
  {runs,results,diff,sum,del,suppress,products,login}
    runs                List the available analysis runs.
    results             List analysis result (finding) summary for a given
                        run.
    diff                Compare two analysis runs and show the difference.
    sum                 Show number of reports per checker.
    del                 Delete analysis runs.
    suppress            Manage and export/import suppressions of a CodeChecker
                        server.
    products            Access subcommands related to configuring the products
                        managed by a CodeChecker server.
    login               Authenticate into CodeChecker servers that require
                        privileges.
```

The operations available in `cmd` **always** require a running CodeChecker
viewer server (i.e. a server started by `CodeChecker server`), and the
connection details to access the server. These details either take an URL form
(`--url hostname:port/Productname`) if the command accesses analysis results
in a given product, or a server URL (`--url hostname:port`), if the command
manages the server.

A server started by default settings (`CodeChecker server`, see above)
automatically configure the product `Default` under `localhost:8001/Default`,
thus the `--url` parameter can be omitted.

Most result-giving commands also take an `--output` format parameter. If this
is set to `json`, a more detailed output is given, in JSON format.

```
common arguments:
  --host HOST           The address of the CodeChecker viewer server to
                        connect to. (default: localhost)
  --url SERVER_URL      The URL of the server to access, in the format of
                        '[http[s]://]host:port'. (default: localhost:8001)
  --url PRODUCT_URL     The URL of the product which will be accessed by the
                        client, in the format of
                        '[http[s]://]host:port/Endpoint'.
                        (default: localhost:8001/Default)
  -o {plaintext,rows,table,csv,json}, --output {plaintext,rows,table,csv,json}
                        The output format to use in showing the data.
                        (default: plaintext)
  --verbose {info,debug,debug_analyzer}
                        Set verbosity level.
```

Results can be filtered by using separate filter options of `results`, `diff`,
`sum`, etc. commands.
```
filter arguments:
  --uniqueing {on,off}  The same bug may appear several times if it is found
                        on different execution paths, i.e. through different
                        function calls. By turning on uniqueing a report
                        appears only once even if it is found on several
                        paths.
  --report-hash [REPORT_HASH [REPORT_HASH ...]]
                        Filter results by report hashes.
  --review-status [REVIEW_STATUS [REVIEW_STATUS ...]]
                        Filter results by review statuses. This can be used
                        only if basename or newname is a run name (on the
                        remote server). (default: ['unreviewed', 'confirmed'])
  --detection-status [DETECTION_STATUS [DETECTION_STATUS ...]]
                        Filter results by detection statuses. This can be used
                        only if basename or newname is a run name (on the
                        remote server). (default: ['new', 'reopened',
                        'unresolved'])
  --severity [SEVERITY [SEVERITY ...]]
                        Filter results by severities.
  --tag [TAG [TAG ...]]
                        Filter results by version tag names. This can be used
                        only if basename or newname is a run name (on the
                        remote server).
  --file [FILE_PATH [FILE_PATH ...]]
                        Filter results by file path. The file path can contain
                        multiple * quantifiers which matches any number of
                        characters (zero or more). So if you have /a/x.cpp and
                        /a/y.cpp then "/a/*.cpp" selects both.
  --checker-name [CHECKER_NAME [CHECKER_NAME ...]]
                        Filter results by checker names. The checker name can
                        contain multiple * quantifiers which matches any
                        number of characters (zero or more). So for example
                        "*DeadStores" will matches "deadcode.DeadStores"
  --checker-msg [CHECKER_MSG [CHECKER_MSG ...]]
                        Filter results by checker messages.The checker message
                        can contain multiple * quantifiers which matches any
                        number of characters (zero or more).
  --component [COMPONENT [COMPONENT ...]]
                        Filter results by source components. This can be used
                        only if basename or newname is a run name (on the
                        remote server).
  --detected-at TIMESTAMP
                        Filter results by detection date. The format of
                        TIMESTAMP is 'year:month:day:hour:minute:second' (the
                        "time" part can be omitted, in which case midnight
                        (00:00:00) is used).
  --fixed-at TIMESTAMP  Filter results by fix date. The format of TIMESTAMP is
                        'year:month:day:hour:minute:second' (the "time" part
                        can be omitted, in which case midnight (00:00:00) is
                        used).
  -s, --suppressed      DEPRECATED. Use the '--filter' option to get false
                        positive (suppressed) results. Show only suppressed
                        results instead of only unsuppressed ones.
  --filter FILTER       DEPRECATED. Filter results. Use separated filter
                        options to filter the results. The filter string has
                        the following format: [<SEVERITIES>]:[<CHECKER_NAMES>]
                        :[<FILE_PATHS>]:[<DETECTION_STATUSES>]:[<REVIEW_STATUS
                        ES>] where severites, checker_names, file_paths,
                        detection_statuses, review_statuses should be a comma
                        separated list, e.g.: "high,medium:unix,core:*.cpp,*.h
                        :new,unresolved:false_positive,intentional"
```

### Source components (`components`) <a name="source-components"></a>

```
usage: CodeChecker cmd components [-h] [--url PRODUCT_URL]
                                  [--verbose {info,debug,debug_analyzer}]
                                  {list,add,del} ...

Source components are named collection of directories specified as directory
filter.

optional arguments:
  -h, --help            show this help message and exit

available actions:
  {list,add,del}
    list                List source components available on the serve
    add                 Creates a new source component.
    del                 Delete a source component from the server.
```


#### New/Edit source component <a name="new-source-components"></a>

```
usage: CodeChecker cmd components add [-h] [--description DESCRIPTION] -i
                                      COMPONENT_FILE [--url PRODUCT_URL]
                                      [--verbose {info,debug,debug_analyzer}]
                                      NAME

Creates a new source component or updates an existing one.

positional arguments:
  NAME                  Unique name of the source component.

optional arguments:
  -h, --help            show this help message and exit
  --description DESCRIPTION
                        A custom textual description to be shown alongside the
                        source component.
  -i COMPONENT_FILE, --import COMPONENT_FILE
                        Path to the source component file which contains
                        multiple file paths. Each file path should start with
                        a '+' or '-' sign.Results will be listed only from
                        paths with a '+' sign. Results will not be listed from
                        paths with a '-' sign. Let's assume there are three
                        directories: test_files, test_data and test_config. In
                        the given example only the results from the test_files
                        and test_data directories will be listed.
                        E.g.:
                        +*/test*/*
                        -*/test_dat*/*
                        Please see the User guide for more information.

```

##### Format of component file <a name="component-file"></a>

Source component helps us to filter run results by multiple file paths.

Each line in the source component file should begin with a `+` or a `-`, followed by
a path glob pattern:
 * `+` ONLY results from the matching file paths will be listed
 * `-` results from the matching file paths will not be listed

Example:
```
-/dont/list/results/in/directory/*
-/dont/list/this.file
+/dir/list/in/directory/*
+/dir/list.this.file
```
Results will be listed only from `/dir/list/in/directory/*` and from the
`/dir/list.this.file`.
In this case removing the `-` rules would not change the list of results.

Example 2:
```
+*/test*
+*/test_files/*
+*/test_data/*
-*/test_p*
```
Results will be listed only from the directories which name begin with
`test` except the results form the directories which name begin with `test_p`.

Note: the order of the source component value is not important. E.g.:
```
+/a/b/x.cpp
-/a/b/
```
means the same as
```
-/a/b/
+/a/b/x.cpp
```
`x.cpp` will be included in the run results and all other files under `/a/b/`
path will not be included.

#### List source components <a name="list-source-components"></a>
List the name and basic information about source component added to the
server.
```
usage: CodeChecker cmd components list [-h] [--url PRODUCT_URL]
                                       [-o {plaintext,rows,table,csv,json}]
                                       [--verbose {info,debug,debug_analyzer}]

List the name and basic information about source component added to the
server.
```

#### Delete source components <a name="delete-source-components"></a>

```
usage: CodeChecker cmd components del [-h] [--url PRODUCT_URL]
                                      [--verbose {info,debug,debug_analyzer}]
                                      NAME

Removes the specified source component.

positional arguments:
  NAME                  The source component name which will be removed.
```

### List runs (`runs`) <a name="cmd-runs"></a>

```
usage: CodeChecker cmd runs [-h] [--url PRODUCT_URL]
                            [-o {plaintext,rows,table,csv,json}]
                            [--verbose {info,debug,debug_analyzer}]

List the analysis runs available on the server.

optional arguments:
  -h, --help            show this help message and exit
  -n [RUN_NAME [RUN_NAME ...]], --name [RUN_NAME [RUN_NAME ...]]
                        Names of the analysis runs. If this argument is not
                        supplied it will show all runs. This has the following
                        format: "<run_name_1> <run_name_2> <run_name_3>" where
                        run names can contain multiple * quantifiers which
                        matches any number of characters (zero or more). So if
                        you have run_1_a_name, run_2_b_name, run_2_c_name,
                        run_3_d_name then "run_2* run_3_d_name" shows the last
                        three runs.
```

### List of run histories (`history`) <a name="cmd-history"></a>

With this command you can list out the specific storage events which happened
during storage processes under multiple run names.

```
usage: CodeChecker cmd history [-h] [-n [RUN_NAME [RUN_NAME ...]]]
                               [--url PRODUCT_URL]
                               [-o {plaintext,rows,table,csv,json}]
                               [--verbose {info,debug,debug_analyzer}]

Show run history for some analysis runs.

optional arguments:
  -h, --help            show this help message and exit
  -n [RUN_NAME [RUN_NAME ...]], --name [RUN_NAME [RUN_NAME ...]]
                        Names of the analysis runs to show history for. If
                        this argument is not supplied it will show the history
                        for all runs. This has the following format:
                        "<run_name_1> <run_name_2> <run_name_3>" where run
                        names can contain multiple * quantifiers which matches
                        any number of characters (zero or more). So if you
                        have run_1_a_name, run_2_b_name, run_2_c_name,
                        run_3_d_name then "run_2* run_3_d_name" shows history
                        for the last three runs. Use 'CodeChecker cmd runs' to
                        get the available runs.
```

### List analysis results' summary (`results`) <a name="cmd-results"></a>

Prints basic information about analysis results, such as location, checker
name, summary.

```
usage: CodeChecker cmd results [-h] [--uniqueing {on,off}]
                               [--report-hash [REPORT_HASH [REPORT_HASH ...]]]
                               [--review-status [REVIEW_STATUS [REVIEW_STATUS ...]]]
                               [--detection-status [DETECTION_STATUS [DETECTION_STATUS ...]]]
                               [--severity [SEVERITY [SEVERITY ...]]]
                               [--tag [TAG [TAG ...]]]
                               [--file [FILE_PATH [FILE_PATH ...]]]
                               [--checker-name [CHECKER_NAME [CHECKER_NAME ...]]]
                               [--checker-msg [CHECKER_MSG [CHECKER_MSG ...]]]
                               [--component [COMPONENT [COMPONENT ...]]]
                               [--detected-at TIMESTAMP]
                               [--fixed-at TIMESTAMP] [-s] [--filter FILTER]
                               [--url PRODUCT_URL]
                               [-o {plaintext,rows,table,csv,json}]
                               [--verbose {info,debug,debug_analyzer}]
                               RUN_NAMES

Show the individual analysis reports' summary.

positional arguments:
  RUN_NAME              Names of the analysis runs to show result summaries of.
                        This has the following format:
                        <run_name_1>:<run_name_2>:<run_name_3> where run names
                        can contain * quantifiers which matches any number of
                        characters (zero or more). So if you have
                        run_1_a_name, run_2_b_name, run_2_c_name, run_3_d_name
                        then "run_2*:run_3_d_name" selects the last three runs.
                        Use 'CodeChecker cmd runs' to get the available runs.

optional arguments:
  -h, --help            show this help message and exit
```

#### Example <a name="cmd-results-example"></a>
```
#Get analysis results for a run:
CodeChecker cmd results my_run

# Get analysis results for multiple runs:
CodeChecker cmd results "my_run1:my_run2"

# Get analysis results by using regex:
CodeChecker cmd results "my_run*"

# Get analysis results for a run and filter the analysis results:
CodeChecker cmd results my_run --severity critical high medium \
    --file "/home/username/my_project/*"
```

### Show differences between two runs (`diff`) <a name="cmd-diff"></a>

This mode shows analysis results (in the same format as `results`) does, but
from the comparison of two runs.

```
usage: CodeChecker cmd diff [-h] -b BASE_RUN -n NEW_RUN [--uniqueing {on,off}]
                            [--report-hash [REPORT_HASH [REPORT_HASH ...]]]
                            [--review-status [REVIEW_STATUS [REVIEW_STATUS ...]]]
                            [--detection-status [DETECTION_STATUS [DETECTION_STATUS ...]]]
                            [--severity [SEVERITY [SEVERITY ...]]]
                            [--tag [TAG [TAG ...]]]
                            [--file [FILE_PATH [FILE_PATH ...]]]
                            [--checker-name [CHECKER_NAME [CHECKER_NAME ...]]]
                            [--checker-msg [CHECKER_MSG [CHECKER_MSG ...]]]
                            [--component [COMPONENT [COMPONENT ...]]]
                            [--detected-at TIMESTAMP] [--fixed-at TIMESTAMP]
                            [-s] [--filter FILTER]
                            (--new | --resolved | --unresolved)
                            [--url PRODUCT_URL]
                            [-o {plaintext,rows,table,csv,json,html}]
                            [-e EXPORT_DIR] [-c]
                            [--verbose {info,debug,debug_analyzer}]

Compare two analysis runs to show the results that differ between the two.

optional arguments:
  -h, --help            show this help message and exit
  -b BASE_RUN, --basename BASE_RUN
                        The 'base' (left) side of the difference: this
                        analysis run is used as the initial state in the
                        comparison. The basename can contain * quantifiers
                        which matches any number of characters (zero or more).
                        So if you have run-a-1, run-a-2 and run-b-1 then
                        "run-a*" selects the first two.
  -n NEW_RUN, --newname NEW_RUN
                        The 'new' (right) side of the difference: this
                        analysis run is compared to the -b/--basename run. The
                        parameter can be a run name(on the remote server) or a
                        local report directory (result of the analyze
                        command). In case of run name the newname can contain
                        * quantifiers which matches any number of characters
                        (zero or more). So if you have run-a-1, run-a-2 and
                        run-b-1 then "run-a*" selects the first two.

comparison modes:
  --new                 Show results that didn't exist in the 'base' but
                        appear in the 'new' run.
  --resolved            Show results that existed in the 'base' but
                        disappeared from the 'new' run.
  --unresolved          Show results that appear in both the 'base' and the
                        'new' run.
```

The command can be used in *local* or *remote* compare modes.

In *local mode* the results of a local analysis (see `CodeChecker analyze`)
can be compared to the results stored (see `CodeChecker store`) on a remote
CodeChecker server or two local report directories can be compared:

- Compare a local analysis directory and a remote run:
  ```sh
  CodeChecker cmd diff -p 8001 --basename my_project --newname ./my_updated_plists --new
  ```
- Compare two local analysis directories:
  ```sh
  CodeChecker cmd diff --basename ./my_updated_plists_base --newname ./my_updated_plists_new --new
  ```

In *remote* compare mode, two runs stored on a remote CodeChecker server can
be compared to each other:

```sh
CodeChecker cmd diff -p 8001 --basename my_project --newname my_new_checkin --new
```

**Note**: unique report identifiers are used to compare analysis results. For
more information see
[analyzer report identification](../analyzer/report_identification.md)
documentation.

#### Example <a name="cmd-diff-example"></a>
Let's assume you have the following C++ code:
```cpp
int foo(int z)
{
  if (z == 0)
    return 1 / z; // Division by zero

  return 0;
}

int bar(int x)
{
  int y;
  y = x % 2; // deadcode.DeadStores

  return x % 2;
}
```
If you log (`CodeChecker log -o compile_command.json -b "g++ example.cpp"`),
analyze (`CodeChecker analyze -o ./test_report_dir compile_command.json`) and
parse (`CodeChecker parse ./test_report_dir`) this code with CodeChecker you
will get a `Division by zero` warning in the `foo` function and a
`deadcode.DeadStores` warning in the `bar` function.

Let's store it to a running CodeChecker server with run name `test_run_name`
(`CodeChecker store -n test_run_name ./test_report_dir`).

Now let's fix one of the previous warning in the `foo` function and create a
new function which contains a new warning:
```cpp
int foo(int z)
{
  if (z != 0)
    return 1 / z;

  return 0;
}

int bar(int x)
{
  int y;
  y = x % 2; // deadcode.DeadStores

  return x % 2;
}

void baz(int *p)
{
  if (!p)
    *p = 0; // core.NullDereference
}
```
Analyze the above code again with CodeChecker to the same report
directory (`CodeChecker analyze -o ./test_report_dir compile_command.json`).
If you parse the results (`CodeChecker parse ./test_report_dir`) you will get
a `deadcode.DeadStores` warning in the `bar` function and a
`core.NullDereference` warning in the `baz` function but the previous warning
in the `foo` function will be disappeared because we fixed it.

Now let's compare our local report directory (`test_report_dir`)
to the results stored on a remote CodeChecker server previously
(`test_run_name`). We have 3 options:
  - Show results that didn't exist in the remote run but appear in the local
  report directory (`new`):
  `CodeChecker cmd diff --basename test_run_name --newname ./test_report_dir --new`

  ```
  [HIGH] example.cpp:20:8: Dereference of null pointer (loaded from variable 'p') [core.NullDereference]
    *p = 0; // core.NullDereference
  ```
  - Show results that existed in the remote run but disappeared from the local
  report directory run (`resolved`):
  `CodeChecker cmd diff --basename test_run_name --newname ./test_report_dir --resolved`

  ```
  [HIGH] example.cpp:4:14: Division by zero [core.DivideZero]
    return 1 / z; // Division by zero
  ```
  - Show results that appear in both the remote run and the local report
  directory too (`unresolved`):
  `CodeChecker cmd diff --basename test_run_name --newname ./test_report_dir --unresolved`

  ```
  [LOW] example.cpp:12:3: Value stored to 'y' is never read [deadcode.DeadStores]
    y = x % 2; // deadcode.DeadStores
  ```

### Show summarised count of results (`sum`) <a name="cmd-sum"></a>

```
usage: CodeChecker cmd sum [-h] (-n RUN_NAME [RUN_NAME ...] | -a)
                           [--disable-unique] [--uniqueing {on,off}]
                           [--report-hash [REPORT_HASH [REPORT_HASH ...]]]
                           [--review-status [REVIEW_STATUS [REVIEW_STATUS ...]]]
                           [--detection-status [DETECTION_STATUS [DETECTION_STATUS ...]]]
                           [--severity [SEVERITY [SEVERITY ...]]]
                           [--tag [TAG [TAG ...]]]
                           [--file [FILE_PATH [FILE_PATH ...]]]
                           [--checker-name [CHECKER_NAME [CHECKER_NAME ...]]]
                           [--checker-msg [CHECKER_MSG [CHECKER_MSG ...]]]
                           [--component [COMPONENT [COMPONENT ...]]]
                           [--detected-at TIMESTAMP] [--fixed-at TIMESTAMP]
                           [-s] [--filter FILTER] [--url PRODUCT_URL]
                           [-o {plaintext,rows,table,csv,json}]
                           [--verbose {info,debug,debug_analyzer}]

Show checker statistics for some analysis runs.

optional arguments:
  -h, --help            show this help message and exit
  -n RUN_NAME [RUN_NAME ...], --name RUN_NAME [RUN_NAME ...]
                        Names of the analysis runs to show result count
                        breakdown for. This has the following format:
                        <run_name_1>:<run_name_2>:<run_name_3> where run names
                        can contain multiple * quantifiers which matches any
                        number of characters (zero or more). So if you have
                        run_1_a_name, run_2_b_name, run_2_c_name, run_3_d_name
                        then "run_2*:run_3_d_name" selects the last three
                        runs. Use 'CodeChecker cmd runs' to get the available
                        runs.
  -a, --all             Show breakdown for all analysis runs.
  --disable-unique      DEPRECATED. Use the '--uniqueing' option to get
                        uniqueing results. List all bugs even if these end up
                        in the same bug location, but reached through
                        different paths. By uniqueing the bugs a report will
                        be appeared only once even if it is found on several
                        paths.
```

#### Example <a name="cmd-sum-example"></a>
```sh
# Get statistics for a run:
CodeChecker cmd sum -n my_run

# Get statistics for all runs filtered by multiple checker names:
CodeChecker cmd sum --all --checker-name "core.*" "deadcode.*"

# Get statistics for all runs and only for severity 'high':
CodeChecker cmd sum --all --severity "high"
```

### Remove analysis runs (`del`) <a name="cmd-del"></a>

```
usage: CodeChecker cmd del [-h]
                           (-n RUN_NAME [RUN_NAME ...] |
                            --all-before-run RUN_NAME |
                            --all-after-run RUN_NAME |
                            --all-after-time TIMESTAMP |
                            --all-before-time TIMESTAMP)
                           [--url PRODUCT_URL]
                           [--verbose {info,debug,debug_analyzer}]

Remove analysis runs from the server based on some criteria. NOTE! When a run
is deleted, ALL associated information is permanently lost!

optional arguments:
  -h, --help            show this help message and exit
  -n RUN_NAME [RUN_NAME ...], --name RUN_NAME [RUN_NAME ...]
                        Full name of the analysis run or runs to delete.
  --all-before-run RUN_NAME
                        Delete all runs that were stored to the server BEFORE
                        the specified one.
  --all-after-run RUN_NAME
                        Delete all runs that were stored to the server AFTER
                        the specified one.
  --all-after-time TIMESTAMP
                        Delete all analysis runs that were stored to the
                        server AFTER the given timestamp. The format of
                        TIMESTAMP is 'year:month:day:hour:minute:second' (the
                        "time" part can be omitted, in which case midnight
                        (00:00:00) is used).
  --all-before-time TIMESTAMP
                        Delete all analysis runs that were stored to the
                        server BEFORE the given timestamp. The format of
                        TIMESTAMP is 'year:month:day:hour:minute:second' (the
                        "time" part can be omitted, in which case midnight
                        (00:00:00) is used).
```

### Manage and export/import suppressions (`suppress`) <a name="manage-suppressions"></a>

```
usage: CodeChecker cmd suppress [-h] [-f] -i SUPPRESS_FILE [--url PRODUCT_URL]
                                [--verbose {info,debug,debug_analyzer}]
                                RUN_NAME

Imports suppressions from a suppress file to a CodeChecker server.

positional arguments:
  RUN_NAME              Name of the analysis run to suppress or unsuppress a
                        report in.

optional arguments:
  -h, --help            show this help message and exit
  -f, --force           Enable suppression of already suppressed reports.
  -i SUPPRESS_FILE, --import SUPPRESS_FILE
                        Import suppression from the suppress file into the
                        database.
```

#### Import suppressions between server and suppress file <a name="import-suppressions"></a>


```
  -i SUPPRESS_FILE, --import SUPPRESS_FILE
                        Import suppression from the suppress file into the
                        database.
```

`--import` **appends** the suppressions found in the given suppress file to
the database on the server.

### Manage product configuration of a server (`products`) <a name="cmd-product"></a>

Please see [Product management](products.md) for details.

### Authenticate to the server (`login`) <a name="cmd-login"></a>

```
usage: CodeChecker cmd login [-h] [-d] [--url SERVER_URL]
                             [--verbose {info,debug,debug_analyzer}]
                             [USERNAME]

Certain CodeChecker servers can require elevated privileges to access analysis
results. In such cases it is mandatory to authenticate to the server. This
action is used to perform an authentication in the command-line.

positional arguments:
  USERNAME              The username to authenticate with. (default: <username>)

optional arguments:
  -h, --help            show this help message and exit
  -d, --deactivate, --logout
                        Send a logout request to end your privileged session.

common arguments:
  --url SERVER_URL      The URL of the server to access, in the format of
                        '[http[s]://]host:port'. (default: localhost:8001)
  --verbose {info,debug,debug_analyzer}
                        Set verbosity level.
```

If a server [requires privileged access](authentication.md), you must
log in before you can access the data on the particular server. Once
authenticated, your session is available for some time and `CodeChecker cmd`
can be used normally.

The password can be saved on the disk. If such "preconfigured" password is
not found, the user will be asked, in the command-line, to provide credentials.


# Source code comments for review status <a name="source-code-comments"></a>

Source code comments can be used in the source files to change the review
status of a specific or all checker results found in a particular line of code.
Source code comment should be above the line where the defect was found, and
__no__ empty lines are allowed between the line with the bug and the source
code comment.

Comment lines staring with `//` or C style `/**/` comments are supported.
Watch out for the comment format!

## Supported formats <a name="supported-formats"></a>
The source code comment has the following format:
```sh
// codechecker comment type [checker name] comment
```

Multiple source code comment types are allowed:
 * `codechecker_suppress`
 * `codechecker_false_positive`
 * `codechecker_intentional`
 * `codechecker_confirmed`

Source code comment change the `review status` of a bug in the following form:
 * `codechecker_suppress` and `codechecker_false_positive` to `False positive`
 * `codechecker_intentional` to `Intentional`
 * `codechecker_confirmed` to `Confirmed`.

Note: `codechecker_suppress` does the same as `codechecker_false_positive`.

You can read more about review status [here](https://github.com/Ericsson/codechecker/blob/master/www/userguide/userguide.md#userguide-review-status)

## Change review status of a specific checker result
```cpp
void test() {
  int x;
  // codechecker_confirmed [deadcode.DeadStores] suppress deadcode
  x = 1; // warn
}
```

## Change review status of a specific checker result by using a substring of the checker name
There is no need to specify the whole checker name in the source code comment
like `deadcode.DeadStores`, because it will not be resilient to package name
changes. You are able to specify only a substring of the checker name for the
source code comment:
```cpp
void test() {
  int x;
  // codechecker_confirmed [DeadStores] suppress deadcode
  x = 1; // warn
}
```


## Change review status of all checker result
```cpp
void test() {
  int x;
  // codechecker_false_positive [all] suppress all checker results
  x = 1; // warn
}
```

## Change review status of all checker result with C style comment
```cpp
void test() {
  int x;
  /* codechecker_false_positive [all] suppress all checker results */
  x = 1; // warn
}
```

## Multi line comments
```cpp
void test() {
  int x;

  // codechecker_suppress [all] suppress all
  // checker resuls
  // with a long
  // comment
  x = 1; // warn
}
```

## Multi line C style comments
```cpp
void test() {
  int x;

  /* codechecker_suppress [all] suppress all
  checker resuls
  with a long
  comment */
  x = 1; // warn
}
```

```cpp
void test() {
  int x;

  /*
    codechecker_suppress [all] suppress all
    checker resuls
    with a long
    comment
  */
  x = 1; // warn
}
```

## Exporting source code suppression to suppress file <a name="suppress-file"></a>

```
  --export-source-suppress
                        Write suppress data from the suppression annotations
                        found in the source files that were analyzed earlier
                        that created the results.
```

```sh
CodeChecker parse ./my_plists --suppress generated.suppress --export-source-suppress
```

# Advanced usage <a name="advanced-usage"></a>

## Run CodeChecker distributed in a cluster <a name="distributed-in-cluster"></a>

You may want to configure CodeChecker to do the analysis on separate machines in a distributed way.
Start the postgres database on a central machine (in this example it is called codechecker.central) on a remotely accessible address and port and then run
```CodeChecker check``` on multiple machines (called host1 and host2), specify the remote dbaddress and dbport and use the same run name.

Create and start an empty database to which the CodeChecker server can connect.

## Setup PostgreSQL (one time only) <a name="pgsql"></a>

Before the first use, you have to setup PostgreSQL.
PostgreSQL stores its data files in a data directory, so before you start the PostgreSQL server you have to create and init this data directory.
I will call the data directory to pgsql_data.

Do the following steps:

```sh
# on machine codechecker.central

mkdir -p /path/to/pgsql_data
initdb -U codechecker -D /path/to/pgsql_data -E "SQL_ASCII"
# Start PostgreSQL server on port 5432
postgres -U codechecker -D /path/to/pgsql_data -p 5432 &>pgsql_log &
# Start the central CodeChecker server
CodeChecker server -w ~/codechecker_workspace --dbaddress localhost --dbport 5432 --view-port 8001
```

## Run CodeChecker on multiple hosts <a name="multiple-hosts"></a>

Then you can run CodeChecker on multiple hosts but using the same run name (in this example this is called "distributed_run".
CodeChecker server is listening on codechecker.central port 8001.

```sh
# On host1 we check module1
CodeChecker check -w /tmp/codechecker_ws -b "cd module_1;make" --port 8001 --host codechecker.central distributed_run

# On host2 we check module2
CodeChecker check -w /tmp/codechecker_ws -b "cd module_2;make" --port 8001 --host codechecker.central disributed_run
```

### PostgreSQL authentication (optional) <a name="pgsql-auth"></a>

If a CodeChecker is run with a user that needs database authentication, the
PGPASSFILE environment variable should be set to a pgpass file
For format and further information see PostgreSQL documentation:
http://www.postgresql.org/docs/current/static/libpq-pgpass.html

# Debugging CodeChecker <a name="debug"></a>

To change the log levels check out the [logging](../logging.md) documentation.
